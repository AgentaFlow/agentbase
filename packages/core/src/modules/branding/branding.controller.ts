import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('branding')
@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get your branding settings' })
  get(@Request() req: any) {
    return this.brandingService.getOrCreate(req.user.sub);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update branding settings' })
  update(@Request() req: any, @Body() dto: UpdateBrandingDto) {
    return this.brandingService.update(req.user.sub, dto as any);
  }

  @Get('css/:ownerId')
  @ApiOperation({ summary: 'Get CSS variables for branding (public)' })
  async css(@Param('ownerId') ownerId: string) {
    const branding = await this.brandingService.getOrCreate(ownerId);
    return { css: this.brandingService.generateCssVariables(branding) };
  }

  @Get('public/:ownerId')
  @ApiOperation({ summary: 'Get public branding config (for widget/embed)' })
  getPublic(@Param('ownerId') ownerId: string) {
    return this.brandingService.getPublicBranding(ownerId);
  }
}
