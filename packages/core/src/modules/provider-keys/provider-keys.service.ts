import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserProviderKey, AiProvider } from "../../database/entities";
import { encrypt, decrypt } from "../../common/utils/encryption.util";
import { SaveProviderKeyDto } from "./dto/save-provider-key.dto";
import { ProviderKeyResponseDto } from "./dto/provider-key-response.dto";

/** Prefix patterns used to sanity-check key format before saving. */
const KEY_PREFIXES: Record<AiProvider, string[]> = {
  [AiProvider.OPENAI]: ["sk-"],
  [AiProvider.ANTHROPIC]: ["sk-ant-"],
  [AiProvider.GEMINI]: ["AIzaSy"],
  [AiProvider.HUGGINGFACE]: ["hf_"],
};

@Injectable()
export class ProviderKeysService {
  private readonly logger = new Logger(ProviderKeysService.name);

  constructor(
    @InjectRepository(UserProviderKey)
    private readonly repo: Repository<UserProviderKey>,
  ) {}

  private toDto(entity: UserProviderKey): ProviderKeyResponseDto {
    return {
      provider: entity.provider,
      keyHint: `····${entity.keyHint}`,
      isActive: entity.isActive,
      lastUsedAt: entity.lastUsedAt,
      lastValidatedAt: entity.lastValidatedAt,
      createdAt: entity.createdAt,
    };
  }

  /** Validate that the key starts with the expected provider prefix. */
  private validateKeyFormat(provider: AiProvider, apiKey: string): void {
    const prefixes = KEY_PREFIXES[provider];
    if (prefixes.length > 0 && !prefixes.some((p) => apiKey.startsWith(p))) {
      throw new BadRequestException(
        `Invalid ${provider} API key format. Expected key starting with: ${prefixes.join(" or ")}`,
      );
    }
  }

  async list(userId: string): Promise<ProviderKeyResponseDto[]> {
    const rows = await this.repo.find({
      where: { userId, isActive: true },
      order: { provider: "ASC" },
    });
    return rows.map((r) => this.toDto(r));
  }

  async upsert(
    userId: string,
    dto: SaveProviderKeyDto,
  ): Promise<ProviderKeyResponseDto> {
    this.validateKeyFormat(dto.provider, dto.apiKey);

    const encryptedApiKey = encrypt(dto.apiKey);
    const keyHint = dto.apiKey.slice(-4);

    const existing = await this.repo.findOne({
      where: { userId, provider: dto.provider },
    });

    if (existing) {
      existing.encryptedApiKey = encryptedApiKey;
      existing.keyHint = keyHint;
      existing.isActive = true;
      existing.lastValidatedAt = null; // invalidate until re-validated
      const saved = await this.repo.save(existing);
      this.logger.log(
        `Provider key updated: ${dto.provider} for user ${userId}`,
      );
      return this.toDto(saved);
    }

    const created = this.repo.create({
      userId,
      provider: dto.provider,
      encryptedApiKey,
      keyHint,
      isActive: true,
    });
    const saved = await this.repo.save(created);
    this.logger.log(`Provider key saved: ${dto.provider} for user ${userId}`);
    return this.toDto(saved);
  }

  async remove(userId: string, provider: AiProvider): Promise<void> {
    const row = await this.repo.findOne({ where: { userId, provider } });
    if (!row) throw new NotFoundException(`No ${provider} key found`);
    await this.repo.remove(row);
    this.logger.log(`Provider key removed: ${provider} for user ${userId}`);
  }

  /**
   * Validate a stored key by making a lightweight live call to the provider.
   * Updates lastValidatedAt on success.
   */
  async validate(
    userId: string,
    provider: AiProvider,
  ): Promise<{ valid: boolean; error?: string }> {
    const row = await this.repo.findOne({
      where: { userId, provider, isActive: true },
    });
    if (!row) throw new NotFoundException(`No active ${provider} key found`);

    let rawKey: string;
    try {
      rawKey = decrypt(row.encryptedApiKey);
    } catch {
      return { valid: false, error: "Key decryption failed" };
    }

    try {
      await this.callProviderValidation(provider, rawKey);
      await this.repo.update(row.id, { lastValidatedAt: new Date() });
      return { valid: true };
    } catch (err: any) {
      return {
        valid: false,
        error: err?.message || "Provider rejected the key",
      };
    }
  }

  private async callProviderValidation(
    provider: AiProvider,
    apiKey: string,
  ): Promise<void> {
    switch (provider) {
      case AiProvider.OPENAI: {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`OpenAI: ${res.status} ${res.statusText}`);
        break;
      }
      case AiProvider.ANTHROPIC: {
        // Anthropic doesn't have a free list endpoint; use a minimal message call
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        // 200 or 401/403 distinguishes valid vs invalid key
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Anthropic: invalid API key`);
        }
        break;
      }
      case AiProvider.GEMINI: {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        );
        if (!res.ok) throw new Error(`Gemini: ${res.status} ${res.statusText}`);
        break;
      }
      case AiProvider.HUGGINGFACE: {
        const res = await fetch("https://huggingface.co/api/whoami-v2", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok)
          throw new Error(`HuggingFace: ${res.status} ${res.statusText}`);
        break;
      }
    }
  }

  /**
   * Returns true if the user has at least one active BYOK key saved.
   * Used by QuotaInterceptor to bypass platform-quota checks for BYOK users
   * on the FREE tier (they use their own API key, not platform resources).
   */
  async hasByokKey(userId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { userId, isActive: true } });
    return count > 0;
  }

  /**
   * Internal use: decrypt and return the raw key for a provider.
   * Called by the chat proxy — result must NEVER be logged or returned to the client.
   */
  async getDecryptedKey(
    userId: string,
    provider: AiProvider,
  ): Promise<string | null> {
    const row = await this.repo.findOne({
      where: { userId, provider, isActive: true },
    });
    if (!row) return null;
    try {
      const raw = decrypt(row.encryptedApiKey);
      // Fire-and-forget update of lastUsedAt
      this.repo.update(row.id, { lastUsedAt: new Date() }).catch(() => {});
      return raw;
    } catch {
      this.logger.error(`Failed to decrypt ${provider} key for user ${userId}`);
      return null;
    }
  }
}
