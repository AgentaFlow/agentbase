import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  @ApiOperation({ summary: 'List all available themes' })
  async findAll() {
    return this.themesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get theme by ID' })
  async findOne(@Param('id') id: string) {
    return this.themesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new theme' })
  async create(@Body() data: any) {
    return this.themesService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a theme' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.themesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a theme' })
  async delete(@Param('id') id: string) {
    await this.themesService.delete(id);
  }
}
