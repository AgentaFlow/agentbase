import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SsoService } from './sso.service';
import { CreateSsoConfigDto, UpdateSsoConfigDto } from './dto/create-sso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sso')
@Controller('sso')
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create SSO configuration' })
  create(@Request() req: any, @Body() dto: CreateSsoConfigDto) {
    return this.ssoService.create(req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List SSO configurations' })
  list(@Request() req: any, @Query('teamId') teamId?: string) {
    return this.ssoService.list(req.user.sub, teamId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SSO configuration' })
  getById(@Param('id') id: string, @Request() req: any) {
    return this.ssoService.getById(id, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update SSO configuration' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateSsoConfigDto) {
    return this.ssoService.update(id, req.user.sub, dto);
  }

  @Post(':id/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable/disable SSO configuration' })
  toggle(@Param('id') id: string, @Request() req: any) {
    return this.ssoService.toggle(id, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete SSO configuration' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.ssoService.remove(id, req.user.sub);
  }

  @Get(':id/saml-metadata')
  @ApiOperation({ summary: 'Get SAML SP metadata XML (public)' })
  samlMetadata(@Param('id') id: string) {
    return this.ssoService.getSamlMetadata(id);
  }
}
