import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";
import { createHmac } from "crypto";

interface CatalogBrowseFilters {
  search?: string;
  category?: string;
  sort?: "popular" | "recent" | "rating" | "downloads" | "newest" | "price";
  page?: number;
  limit?: number;
}

@Injectable()
export class MarketplaceClientService {
  private readonly logger = new Logger(MarketplaceClientService.name);
  private readonly baseUrl: string | undefined;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>("MARKETPLACE_URL");
    if (!this.baseUrl) {
      this.logger.warn(
        "MARKETPLACE_URL is not set — marketplace catalog will return empty results. " +
          "Set MARKETPLACE_URL in your environment to connect to the marketplace service.",
      );
    }
  }

  // ─── Plugins ──────────────────────────────────────────────────────────────

  async getPlugins(filters: CatalogBrowseFilters = {}) {
    if (!this.baseUrl) {
      return { plugins: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }

    const params = this.buildParams(filters);
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/plugins`, { params }),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, "fetch plugins");
    }
  }

  async getPlugin(id: string) {
    if (!this.baseUrl) {
      throw new NotFoundException("Plugin not found");
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/plugins/${id}`),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, `fetch plugin ${id}`);
    }
  }

  async getFeaturedPlugins(limit = 6) {
    if (!this.baseUrl) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/plugins/featured`, {
          params: { limit },
        }),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, "fetch featured plugins");
    }
  }

  async getPluginCategories() {
    if (!this.baseUrl) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/plugins/categories`),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, "fetch plugin categories");
    }
  }

  // ─── Themes ───────────────────────────────────────────────────────────────

  async getThemes(filters: CatalogBrowseFilters = {}) {
    if (!this.baseUrl) {
      return { themes: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }

    const params = this.buildParams(filters);
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/themes`, { params }),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, "fetch themes");
    }
  }

  async getTheme(id: string) {
    if (!this.baseUrl) {
      throw new NotFoundException("Theme not found");
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/themes/${id}`),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, `fetch theme ${id}`);
    }
  }

  async getFeaturedThemes(limit = 6) {
    if (!this.baseUrl) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/themes/featured`, {
          params: { limit },
        }),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, "fetch featured themes");
    }
  }

  async getThemeCategories() {
    if (!this.baseUrl) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/catalog/themes/categories`),
      );
      return response.data;
    } catch (err) {
      this.handleError(err, "fetch theme categories");
    }
  }

  // ─── Installations ────────────────────────────────────────────────────────

  /**
   * Send a heartbeat ping to the marketplace and retrieve available plugin updates.
   *
   * The marketplace looks up all registered plugins for this instanceId and
   * returns any that have a newer published version.
   *
   * Authentication uses HMAC-SHA256:
   *   X-Instance-ID  = instanceId
   *   X-Signature    = HMAC-SHA256(secret, `${instanceId}:${JSON.stringify(body)}`)
   */
  async ping(
    instanceId: string,
  ): Promise<{
    updates: { pluginId: string; latestVersion: string; changelog: string }[];
  }> {
    if (!this.baseUrl) {
      return { updates: [] };
    }

    const secret = this.config.get<string>(
      "MARKETPLACE_INTERNAL_HMAC_SECRET",
      "",
    );
    const body = {};
    const message = `${instanceId}:${JSON.stringify(body)}`;
    const signature = createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    try {
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/installations/ping`, body, {
          headers: {
            "X-Instance-ID": instanceId,
            "X-Signature": signature,
          },
        }),
      );
      return response.data as {
        updates: {
          pluginId: string;
          latestVersion: string;
          changelog: string;
        }[];
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.warn(
        `Marketplace ping failed: ${axiosErr.message} — skipping update check`,
      );
      return { updates: [] };
    }
  }

  // ─── Licenses ─────────────────────────────────────────────────────────────

  async validateLicense(
    licenseKey: string,
    instanceId: string,
  ): Promise<{ valid: boolean; gracePeriodEnd?: string }> {
    if (!this.baseUrl) {
      return { valid: false };
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/licenses/validate`, {
          params: { licenseKey, instanceId },
        }),
      );
      return response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        return { valid: false };
      }
      // Rethrow as-is so LicenseValidatorService can handle network failures
      // with grace period logic
      throw err;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildParams(
    filters: CatalogBrowseFilters,
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (filters.search) params.q = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.sort) params.sort = filters.sort;
    if (filters.page != null) params.page = filters.page;
    if (filters.limit != null) params.limit = filters.limit;
    return params;
  }

  private handleError(err: unknown, operation: string): never {
    const axiosErr = err as AxiosError;
    if (axiosErr.response?.status === 404) {
      throw new NotFoundException("Resource not found");
    }
    this.logger.error(
      `Marketplace API error during "${operation}": ${axiosErr.message}`,
    );
    throw new ServiceUnavailableException(
      "Marketplace service is temporarily unavailable",
    );
  }
}
