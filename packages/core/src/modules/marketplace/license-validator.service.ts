import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import {
  InstalledPlugin,
  InstalledPluginStatus,
} from "../../database/entities";
import { MarketplaceClientService } from "./marketplace-client.service";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 hours

interface CacheEntry {
  valid: boolean;
  gracePeriodEnd?: string;
  expiresAt: number;
}

@Injectable()
export class LicenseValidatorService {
  private readonly logger = new Logger(LicenseValidatorService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly marketplaceClient: MarketplaceClientService,
    private readonly config: ConfigService,
    @InjectRepository(InstalledPlugin)
    private readonly installedRepo: Repository<InstalledPlugin>,
  ) {}

  /**
   * Validate a license key against the marketplace service.
   *
   * 1. Returns the cached result (5-min TTL) if available.
   * 2. On cache miss, calls GET /licenses/validate on the marketplace API.
   *    - On success: persists licenseLastValidated + licenseGracePeriodEnd (now + 72 h)
   *      into installed.settings and caches the result.
   *    - On network failure: returns true within the stored grace period,
   *      false (and deactivates) once the grace period has expired.
   */
  async validate(
    licenseKey: string,
    installed: InstalledPlugin,
  ): Promise<boolean> {
    const instanceId = this.config.get<string>("AGENTBASE_INSTANCE_ID", "");

    // ── 1. Cache hit ──────────────────────────────────────────────────────
    const cached = this.cache.get(licenseKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.valid;
    }

    // ── 2. Call marketplace API ───────────────────────────────────────────
    try {
      const result = await this.marketplaceClient.validateLicense(
        licenseKey,
        instanceId,
      );

      // Persist validation metadata into settings JSONB
      const gracePeriodEnd = new Date(
        Date.now() + GRACE_PERIOD_MS,
      ).toISOString();
      installed.settings = {
        ...installed.settings,
        licenseLastValidated: new Date().toISOString(),
        licenseGracePeriodEnd: gracePeriodEnd,
      };
      await this.installedRepo.save(installed);

      // Cache the result
      this.cache.set(licenseKey, {
        valid: result.valid,
        gracePeriodEnd: result.gracePeriodEnd,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return result.valid;
    } catch (err) {
      // ── 3. Network failure → grace period fallback ────────────────────
      const storedGraceEnd: string | undefined =
        installed.settings?.licenseGracePeriodEnd;

      if (storedGraceEnd && new Date(storedGraceEnd) > new Date()) {
        this.logger.warn(
          `Marketplace API unreachable for license ${licenseKey}. ` +
            `Within grace period (expires ${storedGraceEnd}) — allowing access.`,
        );
        return true;
      }

      this.logger.error(
        `Marketplace API unreachable for license ${licenseKey} and grace period has expired. ` +
          `Deactivating plugin ${installed.id}.`,
      );

      // Deactivate the plugin so it no longer runs
      installed.status = InstalledPluginStatus.INACTIVE;
      await this.installedRepo.save(installed);

      return false;
    }
  }

  /**
   * Daily background job: re-validate every active paid plugin.
   * Paid plugins are identified by settings.isPaid === true and a licenseKey present.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async revalidateAllLicenses(): Promise<void> {
    this.logger.log("Running daily license revalidation...");

    const active = await this.installedRepo.find({
      where: { status: InstalledPluginStatus.ACTIVE },
    });

    const paidInstalls = active.filter(
      (p) => p.settings?.isPaid === true && p.settings?.licenseKey,
    );

    if (paidInstalls.length === 0) {
      this.logger.log("No active paid plugins to revalidate.");
      return;
    }

    let revoked = 0;
    for (const installed of paidInstalls) {
      const valid = await this.validate(
        installed.settings.licenseKey as string,
        installed,
      );
      if (!valid) revoked++;
    }

    this.logger.log(
      `License revalidation complete. ` +
        `${paidInstalls.length} checked, ${revoked} deactivated.`,
    );
  }
}
