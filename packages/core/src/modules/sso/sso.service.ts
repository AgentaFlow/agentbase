import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SsoConfig, SsoProvider } from '../../database/entities/sso-config.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    @InjectRepository(SsoConfig)
    private readonly ssoRepo: Repository<SsoConfig>,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: any): Promise<SsoConfig> {
    // Validate required fields per provider
    if (dto.provider === SsoProvider.SAML) {
      if (!dto.samlEntryPoint || !dto.samlCertificate) {
        throw new BadRequestException('SAML requires entryPoint and certificate');
      }
    } else if (dto.provider === SsoProvider.OIDC) {
      if (!dto.oidcDiscoveryUrl || !dto.oidcClientId || !dto.oidcClientSecret) {
        throw new BadRequestException('OIDC requires discoveryUrl, clientId, and clientSecret');
      }
    }

    const config = this.ssoRepo.create({
      ...dto,
      createdBy: userId,
      isEnabled: false,
    });

    const saved: SsoConfig = (await this.ssoRepo.save(config)) as unknown as SsoConfig;

    await this.audit.log({
      userId,
      action: 'sso.created',
      resource: 'sso_config',
      resourceId: saved.id,
      details: { provider: dto.provider, displayName: dto.displayName },
    });

    return this.sanitize(saved);
  }

  async list(userId: string, teamId?: string): Promise<SsoConfig[]> {
    const where: any = { createdBy: userId };
    if (teamId) where.teamId = teamId;
    const configs = await this.ssoRepo.find({ where, order: { createdAt: 'DESC' } });
    return configs.map(c => this.sanitize(c));
  }

  async getById(id: string, userId: string): Promise<SsoConfig> {
    const config = await this.ssoRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('SSO config not found');
    if (config.createdBy !== userId) throw new ForbiddenException();
    return this.sanitize(config);
  }

  async update(id: string, userId: string, dto: any): Promise<SsoConfig> {
    const config = await this.ssoRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException();
    if (config.createdBy !== userId) throw new ForbiddenException();

    Object.assign(config, dto);
    const saved = await this.ssoRepo.save(config);

    await this.audit.log({
      userId,
      action: 'sso.updated',
      resource: 'sso_config',
      resourceId: id,
      details: { fields: Object.keys(dto) },
    });

    return this.sanitize(saved);
  }

  async toggle(id: string, userId: string): Promise<SsoConfig> {
    const config = await this.ssoRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException();
    if (config.createdBy !== userId) throw new ForbiddenException();

    config.isEnabled = !config.isEnabled;
    const saved = await this.ssoRepo.save(config);

    await this.audit.log({
      userId,
      action: config.isEnabled ? 'sso.enabled' : 'sso.disabled',
      resource: 'sso_config',
      resourceId: id,
    });

    return this.sanitize(saved);
  }

  async remove(id: string, userId: string) {
    const config = await this.ssoRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException();
    if (config.createdBy !== userId) throw new ForbiddenException();

    await this.ssoRepo.remove(config);

    await this.audit.log({
      userId,
      action: 'sso.deleted',
      resource: 'sso_config',
      resourceId: id,
    });

    return { deleted: true };
  }

  // Generate SAML metadata for the IdP
  async getSamlMetadata(id: string): Promise<string> {
    const config = await this.ssoRepo.findOne({ where: { id, provider: SsoProvider.SAML } });
    if (!config) throw new NotFoundException();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/auth/sso/saml/${id}/callback`;

    return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${config.samlIssuer || `agentbase-${id}`}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${callbackUrl}"
      index="0" />
  </SPSSODescriptor>
</EntityDescriptor>`;
  }

  // Track a successful SSO login
  async recordLogin(id: string) {
    await this.ssoRepo.increment({ id }, 'totalLogins', 1);
    await this.ssoRepo.update(id, { lastLoginAt: new Date() });
  }

  // Get OIDC discovery config
  async getOidcConfig(id: string) {
    const config = await this.ssoRepo.findOne({ where: { id, provider: SsoProvider.OIDC } });
    if (!config) throw new NotFoundException();

    return {
      discoveryUrl: config.oidcDiscoveryUrl,
      clientId: config.oidcClientId,
      scopes: config.oidcScopes || ['openid', 'email', 'profile'],
      attributeMapping: config.attributeMapping,
    };
  }

  private sanitize(config: SsoConfig): SsoConfig {
    // Hide secrets in responses
    const sanitized = { ...config };
    if (sanitized.oidcClientSecret) {
      sanitized.oidcClientSecret = '••••••••' + sanitized.oidcClientSecret.slice(-4);
    }
    if (sanitized.samlCertificate) {
      sanitized.samlCertificate = sanitized.samlCertificate.slice(0, 50) + '...';
    }
    return sanitized;
  }
}
