import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('browse')
  @ApiOperation({ summary: 'Browse marketplace plugins' })
  async browse(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: 'popular' | 'recent' | 'rating',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketplaceService.browse({
      search,
      category,
      sort,
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
    });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured plugins' })
  async featured(@Query('limit') limit?: string) {
    return this.marketplaceService.getFeatured(parseInt(limit || '6'));
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get marketplace categories' })
  getCategories() {
    return this.marketplaceService.getCategories();
  }

  @Get('plugins/:id')
  @ApiOperation({ summary: 'Get plugin detail with reviews' })
  async getDetail(@Param('id') id: string) {
    return this.marketplaceService.getPluginDetail(id);
  }

  @Get('plugins/:id/reviews')
  @ApiOperation({ summary: 'Get plugin reviews' })
  async getReviews(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.marketplaceService.getReviews(id, parseInt(limit || '20'), parseInt(skip || '0'));
  }

  @Post('plugins/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a plugin review' })
  async submitReview(
    @Param('id') id: string,
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

  @Delete('plugins/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete your review' })
  async deleteReview(@Param('id') id: string, @Request() req: any) {
    await this.marketplaceService.deleteReview(id, req.user.sub);
    return { deleted: true };
  }
}
