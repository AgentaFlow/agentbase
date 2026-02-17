import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plugin, PluginStatus } from '../../database/entities';
import { PluginReview, PluginReviewDocument } from '../../database/schemas/plugin-review.schema';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(Plugin)
    private readonly pluginRepo: Repository<Plugin>,
    @InjectModel(PluginReview.name)
    private readonly reviewModel: Model<PluginReviewDocument>,
  ) {}

  /**
   * Search/browse plugins in the marketplace.
   */
  async browse(options: {
    search?: string;
    category?: string;
    sort?: 'popular' | 'recent' | 'rating';
    page?: number;
    limit?: number;
  }) {
    const { search, sort = 'popular', page = 1, limit = 20 } = options;

    const query = this.pluginRepo.createQueryBuilder('p')
      .where('p.status = :status', { status: PluginStatus.ACTIVE });

    if (search) {
      query.andWhere('(LOWER(p.name) LIKE :s OR LOWER(p.description) LIKE :s)', {
        s: `%${search.toLowerCase()}%`,
      });
    }

    switch (sort) {
      case 'recent':
        query.orderBy('p.createdAt', 'DESC');
        break;
      case 'rating':
        query.orderBy('p.createdAt', 'DESC'); // Would use rating field if aggregated
        break;
      default:
        query.orderBy('p.createdAt', 'DESC');
    }

    const total = await query.getCount();
    const plugins = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Enrich with ratings
    const enriched = await Promise.all(
      plugins.map(async (p) => {
        const stats = await this.getPluginRatingStats(p.id);
        return { ...p, ...stats };
      }),
    );

    return { plugins: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get detailed plugin info with reviews.
   */
  async getPluginDetail(pluginId: string) {
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException('Plugin not found');

    const stats = await this.getPluginRatingStats(pluginId);
    const reviews = await this.reviewModel
      .find({ pluginId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    return { ...plugin, ...stats, reviews };
  }

  /**
   * Submit a review for a plugin.
   */
  async submitReview(pluginId: string, userId: string, userName: string, data: {
    rating: number;
    review: string;
  }) {
    // Check plugin exists
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException('Plugin not found');

    // Upsert review (one per user per plugin)
    const existing = await this.reviewModel.findOne({ pluginId, userId });
    if (existing) {
      existing.rating = data.rating;
      existing.review = data.review;
      existing.pluginVersion = plugin.version;
      await existing.save();
      this.logger.log(`Review updated for plugin ${pluginId} by user ${userId}`);
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
    if (result.deletedCount === 0) throw new NotFoundException('Review not found');
  }

  private async getPluginRatingStats(pluginId: string) {
    const stats = await this.reviewModel.aggregate([
      { $match: { pluginId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          stars5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          stars4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          stars3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          stars2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          stars1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ]);

    if (stats.length === 0) {
      return { avgRating: 0, totalReviews: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }

    const s = stats[0];
    return {
      avgRating: Math.round(s.avgRating * 10) / 10,
      totalReviews: s.totalReviews,
      ratingDistribution: { 5: s.stars5, 4: s.stars4, 3: s.stars3, 2: s.stars2, 1: s.stars1 },
    };
  }

  /**
   * Featured plugins (curated or top-rated).
   */
  async getFeatured(limit = 6) {
    const plugins = await this.pluginRepo.find({
      where: { status: PluginStatus.ACTIVE },
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      plugins.map(async (p) => ({
        ...p,
        ...(await this.getPluginRatingStats(p.id)),
      })),
    );
  }

  /**
   * Get categories from plugin tags/manifests.
   */
  getCategories() {
    return [
      { slug: 'chat', name: 'Chat & Messaging', icon: '💬' },
      { slug: 'analytics', name: 'Analytics', icon: '📊' },
      { slug: 'integrations', name: 'Integrations', icon: '🔗' },
      { slug: 'security', name: 'Security', icon: '🔒' },
      { slug: 'ai-tools', name: 'AI Tools', icon: '🤖' },
      { slug: 'productivity', name: 'Productivity', icon: '⚡' },
      { slug: 'ecommerce', name: 'E-Commerce', icon: '🛒' },
      { slug: 'content', name: 'Content', icon: '📝' },
    ];
  }
}
