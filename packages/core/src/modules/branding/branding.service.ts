import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branding } from '../../database/entities/branding.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);

  constructor(
    @InjectRepository(Branding)
    private readonly brandingRepo: Repository<Branding>,
    private readonly audit: AuditService,
  ) {}

  async getOrCreate(ownerId: string): Promise<Branding> {
    let branding = await this.brandingRepo.findOne({ where: { ownerId } });
    if (!branding) {
      branding = this.brandingRepo.create({
        ownerId,
        primaryColor: '#4F46E5',
        secondaryColor: '#7C3AED',
        accentColor: '#06B6D4',
        backgroundColor: '#FFFFFF',
        textColor: '#1E293B',
        fontFamily: 'Inter, sans-serif',
        showPoweredBy: true,
        widgetConfig: {
          position: 'bottom-right',
          borderRadius: 16,
          showPoweredBy: true,
          welcomeMessage: 'Hi! How can I help you today?',
          placeholder: 'Type a message...',
        },
      });
      branding = await this.brandingRepo.save(branding);
    }
    return branding;
  }

  async update(ownerId: string, dto: Partial<Branding>): Promise<Branding> {
    const branding = await this.getOrCreate(ownerId);

    // Merge nested objects
    if (dto.widgetConfig) {
      branding.widgetConfig = { ...branding.widgetConfig, ...dto.widgetConfig };
      delete dto.widgetConfig;
    }
    if (dto.emailConfig) {
      branding.emailConfig = { ...branding.emailConfig, ...dto.emailConfig };
      delete dto.emailConfig;
    }

    Object.assign(branding, dto);
    const saved = await this.brandingRepo.save(branding);

    await this.audit.log({
      userId: ownerId,
      action: 'branding.updated',
      resource: 'branding',
      resourceId: saved.id,
      details: { fields: Object.keys(dto) },
    });

    return saved;
  }

  async getPublicBranding(ownerId: string) {
    const branding = await this.getOrCreate(ownerId);
    return {
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      backgroundColor: branding.backgroundColor,
      textColor: branding.textColor,
      fontFamily: branding.fontFamily,
      headingFont: branding.headingFont,
      widgetConfig: branding.widgetConfig,
      customCss: branding.customCss,
      showPoweredBy: branding.showPoweredBy,
    };
  }

  generateCssVariables(branding: Branding): string {
    return `:root {
  --ab-primary: ${branding.primaryColor || '#4F46E5'};
  --ab-secondary: ${branding.secondaryColor || '#7C3AED'};
  --ab-accent: ${branding.accentColor || '#06B6D4'};
  --ab-bg: ${branding.backgroundColor || '#FFFFFF'};
  --ab-text: ${branding.textColor || '#1E293B'};
  --ab-font: ${branding.fontFamily || 'Inter, sans-serif'};
  --ab-heading-font: ${branding.headingFont || branding.fontFamily || 'Inter, sans-serif'};
  --ab-widget-radius: ${branding.widgetConfig?.borderRadius ?? 16}px;
}
${branding.customCss || ''}`;
  }
}
