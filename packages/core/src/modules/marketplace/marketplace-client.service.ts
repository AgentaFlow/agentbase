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
