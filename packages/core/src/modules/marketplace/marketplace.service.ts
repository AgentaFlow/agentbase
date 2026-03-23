import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Plugin, PluginStatus, Theme } from "../../database/entities";
import {
  PluginReview,
  PluginReviewDocument,
} from "../../database/schemas/plugin-review.schema";
import {
  ThemeReview,
  ThemeReviewDocument,
} from "../../database/schemas/theme-review.schema";
import {
  PluginVersion,
  PluginVersionDocument,
} from "../../database/schemas/plugin-version.schema";
import { MarketplaceClientService } from "./marketplace-client.service";

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(Plugin)
    private readonly pluginRepo: Repository<Plugin>,
    @InjectRepository(Theme)
    private readonly themeRepo: Repository<Theme>,
    @InjectModel(PluginReview.name)
    private readonly reviewModel: Model<PluginReviewDocument>,
    @InjectModel(ThemeReview.name)
    private readonly themeReviewModel: Model<ThemeReviewDocument>,
    @InjectModel(PluginVersion.name)
    private readonly pluginVersionModel: Model<PluginVersionDocument>,
    private readonly marketplaceClient: MarketplaceClientService,
  ) {}

  /**
   * Search/browse plugins in the marketplace (delegated to marketplace service).
   */
  async browse(options: {
    search?: string;
    category?: string;
    sort?: "popular" | "recent" | "rating";
    page?: number;
    limit?: number;
  }) {
    return this.marketplaceClient.getPlugins(options);
  }

  /**
   * Get detailed plugin info from marketplace, merged with local reviews.
   */
  async getPluginDetail(pluginId: string) {
    const plugin = await this.marketplaceClient.getPlugin(pluginId);

    const reviews = await this.reviewModel
      .find({ pluginId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    return { ...plugin, reviews };
  }

  /**
   * Submit a review for a plugin.
   */
  async submitReview(
    pluginId: string,
    userId: string,
    userName: string,
    data: {
      rating: number;
      review: string;
    },
  ) {
    // Check plugin exists
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException("Plugin not found");

    // Upsert review (one per user per plugin)
    const existing = await this.reviewModel.findOne({ pluginId, userId });
    if (existing) {
      existing.rating = data.rating;
      existing.review = data.review;
      existing.pluginVersion = plugin.version;
      await existing.save();
      this.logger.log(
        `Review updated for plugin ${pluginId} by user ${userId}`,
      );
      return existing;
    }

    const review = new this.reviewModel({
      pluginId,
      userId,
      userName,
      rating: data.rating,
      review: data.review,
      pluginVersion: plugin.version,
    });
    await review.save();
    this.logger.log(`Review created for plugin ${pluginId} by user ${userId}`);
    return review;
  }

  /**
   * Get reviews for a plugin.
   */
  async getReviews(pluginId: string, limit = 20, skip = 0) {
    const reviews = await this.reviewModel
      .find({ pluginId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.reviewModel.countDocuments({ pluginId });
    return { reviews, total };
  }

  /**
   * Delete a review.
   */
  async deleteReview(pluginId: string, userId: string) {
    const result = await this.reviewModel.deleteOne({ pluginId, userId });
    if (result.deletedCount === 0)
      throw new NotFoundException("Review not found");
  }

  private async getPluginRatingStats(_pluginId: string) {
    // Deprecated: rating stats are now provided by the marketplace service API.
    // Kept as a stub in case local review logic needs it in a future phase.
    return {
      avgRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  /**
   * Featured plugins (delegated to marketplace service).
   */
  async getFeatured(limit = 6) {
    return this.marketplaceClient.getFeaturedPlugins(limit);
  }

  /**
   * Get plugin categories (delegated to marketplace service).
   */
  async getCategories() {
    return this.marketplaceClient.getPluginCategories();
  }

  // ===== Theme Marketplace =====

  /**
   * Browse themes in the marketplace (delegated to marketplace service).
   */
  async browseThemes(options: {
    search?: string;
    category?: string;
    sort?: "popular" | "recent" | "rating";
    page?: number;
    limit?: number;
  }) {
    return this.marketplaceClient.getThemes(options);
  }

  /**
   * Get theme detail from marketplace, merged with local reviews.
   */
  async getThemeDetail(themeId: string) {
    const theme = await this.marketplaceClient.getTheme(themeId);

    const reviews = await this.themeReviewModel
      .find({ themeId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    return { ...theme, reviews };
  }

  /**
   * Submit a review for a theme.
   */
  async submitThemeReview(
    themeId: string,
    userId: string,
    userName: string,
    data: {
      rating: number;
      review: string;
    },
  ) {
    const theme = await this.themeRepo.findOne({ where: { id: themeId } });
    if (!theme) throw new NotFoundException("Theme not found");

    const existing = await this.themeReviewModel.findOne({ themeId, userId });
    if (existing) {
      existing.rating = data.rating;
      existing.review = data.review;
      existing.themeVersion = theme.version;
      await existing.save();
      this.logger.log(`Theme review updated for ${themeId} by user ${userId}`);
      return existing;
    }

    const review = new this.themeReviewModel({
      themeId,
      userId,
      userName,
      rating: data.rating,
      review: data.review,
      themeVersion: theme.version,
    });
    await review.save();

    // Update aggregate rating on theme entity
    const stats = await this.getThemeRatingStats(themeId);
    await this.themeRepo.update(themeId, { rating: stats.avgRating });

    this.logger.log(`Theme review created for ${themeId} by user ${userId}`);
    return review;
  }

  /**
   * Get reviews for a theme.
   */
  async getThemeReviews(themeId: string, limit = 20, skip = 0) {
    const reviews = await this.themeReviewModel
      .find({ themeId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.themeReviewModel.countDocuments({ themeId });
    return { reviews, total };
  }

  /**
   * Delete a theme review.
   */
  async deleteThemeReview(themeId: string, userId: string) {
    const result = await this.themeReviewModel.deleteOne({ themeId, userId });
    if (result.deletedCount === 0)
      throw new NotFoundException("Review not found");

    // Update aggregate rating
    const stats = await this.getThemeRatingStats(themeId);
    await this.themeRepo.update(themeId, { rating: stats.avgRating });
  }

  /**
   * Featured themes (delegated to marketplace service).
   */
  async getFeaturedThemes(limit = 6) {
    return this.marketplaceClient.getFeaturedThemes(limit);
  }

  /**
   * Get theme categories (delegated to marketplace service).
   */
  async getThemeCategories() {
    return this.marketplaceClient.getThemeCategories();
  }

  private async getThemeRatingStats(themeId: string) {
    const stats = await this.themeReviewModel.aggregate([
      { $match: { themeId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          stars5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          stars4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          stars3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          stars2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          stars1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        avgRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const s = stats[0];
    return {
      avgRating: Math.round(s.avgRating * 10) / 10,
      totalReviews: s.totalReviews,
      ratingDistribution: {
        5: s.stars5,
        4: s.stars4,
        3: s.stars3,
        2: s.stars2,
        1: s.stars1,
      },
    };
  }

  // ===== Plugin Versioning =====

  /**
   * Publish a new version of a plugin.
   */
  async publishVersion(
    pluginId: string,
    publishedBy: string,
    data: {
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
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException("Plugin not found");

    // Check duplicate version
    const existing = await this.pluginVersionModel.findOne({
      pluginId,
      version: data.version,
    });
    if (existing)
      throw new ConflictException(`Version ${data.version} already exists`);

    const version = new this.pluginVersionModel({
      pluginId,
      version: data.version,
      changelog: data.changelog,
      downloadUrl: data.downloadUrl,
      fileSize: data.fileSize,
      checksum: data.checksum,
      compatibility: data.compatibility || {},
      publishedBy,
    });
    await version.save();

    // Update the plugin's current version
    await this.pluginRepo.update(pluginId, { version: data.version });

    this.logger.log(`Plugin ${plugin.name} version ${data.version} published`);
    return version;
  }

  /**
   * Get all versions of a plugin.
   */
  async getVersions(pluginId: string) {
    return this.pluginVersionModel
      .find({ pluginId })
      .sort({ releasedAt: -1 })
      .exec();
  }

  /**
   * Get a specific version of a plugin.
   */
  async getVersion(pluginId: string, version: string) {
    const ver = await this.pluginVersionModel.findOne({ pluginId, version });
    if (!ver) throw new NotFoundException(`Version ${version} not found`);
    return ver;
  }

  // ===== Developer Submission =====

  /**
   * Submit a plugin for review (developer portal).
   */
  async submitPlugin(
    ownerId: string,
    data: {
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
    // Check slug uniqueness
    const existing = await this.pluginRepo.findOne({
      where: { slug: data.slug },
    });
    if (existing)
      throw new ConflictException(
        `Plugin slug "${data.slug}" is already taken`,
      );

    const plugin = this.pluginRepo.create({
      ...data,
      status: PluginStatus.DRAFT,
    });

    const saved = await this.pluginRepo.save(plugin);
    this.logger.log(`Plugin "${data.name}" submitted by ${ownerId}`);
    return saved;
  }

  /**
   * Submit a theme for review (developer portal).
   */
  async submitTheme(
    ownerId: string,
    data: {
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
    const existing = await this.themeRepo.findOne({
      where: { slug: data.slug },
    });
    if (existing)
      throw new ConflictException(`Theme slug "${data.slug}" is already taken`);

    const theme = this.themeRepo.create({
      ...data,
      isActive: false, // Pending review
    });

    const saved = await this.themeRepo.save(theme);
    this.logger.log(`Theme "${data.name}" submitted by ${ownerId}`);
    return saved;
  }

  /**
   * Approve a plugin (admin).
   */
  async approvePlugin(pluginId: string) {
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException("Plugin not found");

    plugin.status = PluginStatus.PUBLISHED;
    await this.pluginRepo.save(plugin);
    this.logger.log(`Plugin "${plugin.name}" approved`);
    return plugin;
  }

  /**
   * Reject a plugin (admin).
   */
  async rejectPlugin(pluginId: string) {
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException("Plugin not found");

    plugin.status = PluginStatus.DRAFT;
    await this.pluginRepo.save(plugin);
    this.logger.log(`Plugin "${plugin.name}" rejected`);
    return plugin;
  }

  /**
   * Approve a theme (admin).
   */
  async approveTheme(themeId: string) {
    const theme = await this.themeRepo.findOne({ where: { id: themeId } });
    if (!theme) throw new NotFoundException("Theme not found");

    theme.isActive = true;
    await this.themeRepo.save(theme);
    this.logger.log(`Theme "${theme.name}" approved`);
    return theme;
  }

  /**
   * Reject a theme (admin).
   */
  async rejectTheme(themeId: string) {
    const theme = await this.themeRepo.findOne({ where: { id: themeId } });
    if (!theme) throw new NotFoundException("Theme not found");

    theme.isActive = false;
    await this.themeRepo.save(theme);
    this.logger.log(`Theme "${theme.name}" rejected`);
    return theme;
  }

  /**
   * Get pending submissions (admin).
   */
  async getPendingPlugins(page = 1, limit = 20) {
    const [plugins, total] = await this.pluginRepo.findAndCount({
      where: { status: PluginStatus.DRAFT },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });
    return {
      plugins,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending theme submissions (admin).
   */
  async getPendingThemes(page = 1, limit = 20) {
    const [themes, total] = await this.themeRepo.findAndCount({
      where: { isActive: false },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });
    return { themes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Increment download count for a plugin.
   */
  async incrementPluginDownloads(pluginId: string) {
    await this.pluginRepo.increment({ id: pluginId }, "downloadCount", 1);
  }

  /**
   * Increment download count for a theme.
   */
  async incrementThemeDownloads(themeId: string) {
    await this.themeRepo.increment({ id: themeId }, "downloadCount", 1);
  }
}
