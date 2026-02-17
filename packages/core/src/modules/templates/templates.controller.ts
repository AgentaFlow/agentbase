import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, OnModuleInit,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController implements OnModuleInit {
  constructor(private readonly templatesService: TemplatesService) {}

  async onModuleInit() {
    await this.templatesService.seedDefaults();
  }

  @Get()
  @ApiOperation({ summary: 'Browse app templates' })
  async browse(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
  ) {
    return this.templatesService.browse({
      category,
      search,
      sort,
      page: parseInt(page || '1'),
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get template categories' })
  async categories() {
    return this.templatesService.getCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get template by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.templatesService.findBySlug(slug);
  }

  @Post(':id/deploy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deploy a template (returns config to create app)' })
  async deploy(@Param('id') id: string) {
    return this.templatesService.deploy(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new template (admin)' })
  async create(@Body() body: any, @Request() req: any) {
    return this.templatesService.create({ ...body, authorId: req.user.sub });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a template' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a template' })
  async delete(@Param('id') id: string) {
    await this.templatesService.delete(id);
    return { deleted: true };
  }
}
