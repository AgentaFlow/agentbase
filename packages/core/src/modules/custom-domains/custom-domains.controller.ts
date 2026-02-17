import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomDomainsService } from './custom-domains.service';
import { CreateDomainDto, UpdateDomainSettingsDto } from './dto/create-domain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('custom-domains')
@Controller('custom-domains')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomDomainsController {
  constructor(private readonly domainsService: CustomDomainsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a custom domain' })
  create(@Request() req: any, @Body() dto: CreateDomainDto) {
    return this.domainsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List your custom domains' })
  list(@Request() req: any) {
    return this.domainsService.list(req.user.sub);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify DNS for a custom domain' })
  verify(@Param('id') id: string, @Request() req: any) {
    return this.domainsService.verify(id, req.user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update domain settings' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateDomainSettingsDto) {
    return this.domainsService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a custom domain' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.domainsService.remove(id, req.user.sub);
  }

  @Get(':id/dns')
  @ApiOperation({ summary: 'Get DNS configuration instructions' })
  async dnsInstructions(@Param('id') id: string, @Request() req: any) {
    const domains = await this.domainsService.list(req.user.sub);
    const domain = domains.find(d => d.id === id);
    if (!domain) return { error: 'Not found' };
    return this.domainsService.getDnsInstructions(domain);
  }
}
