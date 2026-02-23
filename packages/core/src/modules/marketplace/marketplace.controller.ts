import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MarketplaceService } from "./marketplace.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

@ApiTags("marketplace")
@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // ===== Plugin Marketplace =====

  @Get("browse")
  @ApiOperation({ summary: "Browse marketplace plugins" })
  async browse(
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("sort") sort?: "popular" | "recent" | "rating",
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.marketplaceService.browse({
      search,
      category,
      sort,
      page: parseInt(page || "1"),
      limit: parseInt(limit || "20"),
    });
  }

  @Get("featured")
  @ApiOperation({ summary: "Get featured plugins" })
  async featured(@Query("limit") limit?: string) {
    return this.marketplaceService.getFeatured(parseInt(limit || "6"));
  }

  @Get("categories")
  @ApiOperation({ summary: "Get marketplace categories" })
  getCategories() {
    return this.marketplaceService.getCategories();
  }

  @Get("plugins/:id")
  @ApiOperation({ summary: "Get plugin detail with reviews" })
  async getDetail(@Param("id") id: string) {
    return this.marketplaceService.getPluginDetail(id);
  }

  @Get("plugins/:id/reviews")
  @ApiOperation({ summary: "Get plugin reviews" })
  async getReviews(
    @Param("id") id: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    return this.marketplaceService.getReviews(
      id,
      parseInt(limit || "20"),
      parseInt(skip || "0"),
    );
  }

  @Post("plugins/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit a plugin review" })
  async submitReview(
    @Param("id") id: string,
    @Request() req: any,
    @Body() body: { rating: number; review: string },
  ) {
    return this.marketplaceService.submitReview(
      id,
      req.user.sub,
      req.user.displayName || req.user.email,
      body,
    );
  }

  @Delete("plugins/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete your review" })
  async deleteReview(@Param("id") id: string, @Request() req: any) {
    await this.marketplaceService.deleteReview(id, req.user.sub);
    return { deleted: true };
  }

  // ===== Plugin Versioning =====

  @Get("plugins/:id/versions")
  @ApiOperation({ summary: "Get all versions of a plugin" })
  async getVersions(@Param("id") id: string) {
    return this.marketplaceService.getVersions(id);
  }

  @Get("plugins/:id/versions/:version")
  @ApiOperation({ summary: "Get a specific version of a plugin" })
  async getVersion(@Param("id") id: string, @Param("version") version: string) {
    return this.marketplaceService.getVersion(id, version);
  }

  @Post("plugins/:id/versions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publish a new version of a plugin" })
  async publishVersion(
    @Param("id") id: string,
    @Request() req: any,
    @Body()
    body: {
      version: string;
      changelog?: string;
      downloadUrl?: string;
      fileSize?: number;
      checksum?: string;
      compatibility?: {
        minPlatformVersion?: string;
        maxPlatformVersion?: string;
      };
    },
  ) {
    return this.marketplaceService.publishVersion(id, req.user.sub, body);
  }

  // ===== Theme Marketplace =====

  @Get("themes")
  @ApiOperation({ summary: "Browse marketplace themes" })
  async browseThemes(
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("sort") sort?: "popular" | "recent" | "rating",
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.marketplaceService.browseThemes({
      search,
      category,
      sort,
      page: parseInt(page || "1"),
      limit: parseInt(limit || "20"),
    });
  }

  @Get("themes/featured")
  @ApiOperation({ summary: "Get featured themes" })
  async featuredThemes(@Query("limit") limit?: string) {
    return this.marketplaceService.getFeaturedThemes(parseInt(limit || "6"));
  }

  @Get("themes/categories")
  @ApiOperation({ summary: "Get theme categories" })
  getThemeCategories() {
    return this.marketplaceService.getThemeCategories();
  }

  @Get("themes/:id")
  @ApiOperation({ summary: "Get theme detail with reviews" })
  async getThemeDetail(@Param("id") id: string) {
    return this.marketplaceService.getThemeDetail(id);
  }

  @Get("themes/:id/reviews")
  @ApiOperation({ summary: "Get theme reviews" })
  async getThemeReviews(
    @Param("id") id: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    return this.marketplaceService.getThemeReviews(
      id,
      parseInt(limit || "20"),
      parseInt(skip || "0"),
    );
  }

  @Post("themes/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit a theme review" })
  async submitThemeReview(
    @Param("id") id: string,
    @Request() req: any,
    @Body() body: { rating: number; review: string },
  ) {
    return this.marketplaceService.submitThemeReview(
      id,
      req.user.sub,
      req.user.displayName || req.user.email,
      body,
    );
  }

  @Delete("themes/:id/reviews")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete your theme review" })
  async deleteThemeReview(@Param("id") id: string, @Request() req: any) {
    await this.marketplaceService.deleteThemeReview(id, req.user.sub);
    return { deleted: true };
  }

  // ===== Developer Submission Portal =====

  @Post("submit/plugin")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit a new plugin for review" })
  async submitPlugin(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      slug: string;
      version: string;
      description?: string;
      author?: string;
      authorUrl?: string;
      repositoryUrl?: string;
      iconUrl?: string;
      screenshots?: string[];
      isPaid?: boolean;
      price?: number;
      manifest?: Record<string, any>;
    },
  ) {
    return this.marketplaceService.submitPlugin(req.user.sub, body);
  }

  @Post("submit/theme")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit a new theme for review" })
  async submitTheme(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      slug: string;
      version: string;
      description?: string;
      author?: string;
      authorUrl?: string;
      previewUrl?: string;
      iconUrl?: string;
      screenshots?: string[];
      category?: string;
      isPaid?: boolean;
      price?: number;
      manifest?: Record<string, any>;
      defaultStyles?: Record<string, any>;
    },
  ) {
    return this.marketplaceService.submitTheme(req.user.sub, body);
  }

  // ===== Admin: Approval Workflow =====

  @Get("admin/pending/plugins")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get pending plugin submissions (admin)" })
  async getPendingPlugins(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.marketplaceService.getPendingPlugins(
      parseInt(page || "1"),
      parseInt(limit || "20"),
    );
  }

  @Get("admin/pending/themes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get pending theme submissions (admin)" })
  async getPendingThemes(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.marketplaceService.getPendingThemes(
      parseInt(page || "1"),
      parseInt(limit || "20"),
    );
  }

  @Post("admin/plugins/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve a plugin submission (admin)" })
  async approvePlugin(@Param("id") id: string) {
    return this.marketplaceService.approvePlugin(id);
  }

  @Post("admin/plugins/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reject a plugin submission (admin)" })
  async rejectPlugin(@Param("id") id: string) {
    return this.marketplaceService.rejectPlugin(id);
  }

  @Post("admin/themes/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve a theme submission (admin)" })
  async approveTheme(@Param("id") id: string) {
    return this.marketplaceService.approveTheme(id);
  }

  @Post("admin/themes/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reject a theme submission (admin)" })
  async rejectTheme(@Param("id") id: string) {
    return this.marketplaceService.rejectTheme(id);
  }
}
