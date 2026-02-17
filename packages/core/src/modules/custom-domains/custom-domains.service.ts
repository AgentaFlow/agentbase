import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { resolve } from 'dns';
import { promisify } from 'util';
import { CustomDomain, DomainStatus } from '../../database/entities/custom-domain.entity';
import { AuditService } from '../audit/audit.service';

const resolveCname = promisify(resolve);
const resolveTxt = promisify((hostname: string, cb: (err: any, records?: string[][]) => void) => {
  require('dns').resolveTxt(hostname, cb);
});

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'custom.agentbase.dev';
const RESERVED_DOMAINS = ['agentbase.dev', 'agentbase.com', 'localhost'];

@Injectable()
export class CustomDomainsService {
  private readonly logger = new Logger(CustomDomainsService.name);

  constructor(
    @InjectRepository(CustomDomain)
    private readonly domainRepo: Repository<CustomDomain>,
    private readonly audit: AuditService,
  ) {}

  async create(ownerId: string, dto: { domain: string; applicationId?: string }) {
    const domain = dto.domain.toLowerCase().trim();

    // Validate not reserved
    if (RESERVED_DOMAINS.some(r => domain === r || domain.endsWith('.' + r))) {
      throw new BadRequestException('This domain is reserved');
    }

    // Check uniqueness
    const existing = await this.domainRepo.findOne({ where: { domain } });
    if (existing) {
      throw new BadRequestException('Domain already registered');
    }

    const verificationToken = randomBytes(32).toString('hex').slice(0, 32);

    const record = this.domainRepo.create({
      domain,
      ownerId,
      applicationId: dto.applicationId || null,
      verificationToken,
      verificationMethod: 'cname',
      status: DomainStatus.PENDING,
    });

    const saved = await this.domainRepo.save(record);

    await this.audit.log({
      userId: ownerId,
      action: 'custom_domain.created',
      resource: 'custom_domain',
      resourceId: saved.id,
      details: { domain },
    });

    return {
      ...saved,
      dnsInstructions: this.getDnsInstructions(saved),
    };
  }

  getDnsInstructions(domain: CustomDomain) {
    return {
      cname: {
        type: 'CNAME',
        host: domain.domain,
        value: PLATFORM_DOMAIN,
        description: `Add a CNAME record pointing ${domain.domain} to ${PLATFORM_DOMAIN}`,
      },
      txt: {
        type: 'TXT',
        host: `_agentbase-verify.${domain.domain}`,
        value: domain.verificationToken,
        description: `Add a TXT record at _agentbase-verify.${domain.domain} with value ${domain.verificationToken}`,
      },
    };
  }

  async verify(id: string, ownerId: string): Promise<{ verified: boolean; method?: string; error?: string }> {
    const domain = await this.getOwnedDomain(id, ownerId);

    domain.lastCheckAt = new Date();
    domain.checkAttempts += 1;
    domain.status = DomainStatus.VERIFYING;

    // Try CNAME verification
    try {
      const records = await resolveCname(domain.domain) as any;
      const cnameValues = Array.isArray(records) ? records.map((r: any) => String(r).toLowerCase()) : [];
      if (cnameValues.some(v => v.includes(PLATFORM_DOMAIN.toLowerCase()))) {
        domain.verified = true;
        domain.verifiedAt = new Date();
        domain.verificationMethod = 'cname';
        domain.status = DomainStatus.ACTIVE;
        await this.domainRepo.save(domain);

        await this.audit.log({
          userId: ownerId,
          action: 'custom_domain.verified',
          resource: 'custom_domain',
          resourceId: id,
          details: { domain: domain.domain, method: 'cname' },
        });

        return { verified: true, method: 'cname' };
      }
    } catch { /* CNAME not found, try TXT */ }

    // Try TXT verification
    try {
      const txtRecords = await resolveTxt(`_agentbase-verify.${domain.domain}`) as string[][];
      const flatValues = txtRecords.flat().map(v => v.trim());
      if (flatValues.includes(domain.verificationToken)) {
        domain.verified = true;
        domain.verifiedAt = new Date();
        domain.verificationMethod = 'txt';
        domain.status = DomainStatus.ACTIVE;
        await this.domainRepo.save(domain);

        await this.audit.log({
          userId: ownerId,
          action: 'custom_domain.verified',
          resource: 'custom_domain',
          resourceId: id,
          details: { domain: domain.domain, method: 'txt' },
        });

        return { verified: true, method: 'txt' };
      }
    } catch { /* TXT not found */ }

    // Verification failed
    if (domain.checkAttempts >= 10) {
      domain.status = DomainStatus.FAILED;
    }
    await this.domainRepo.save(domain);

    return { verified: false, error: 'DNS records not found. Please check your DNS configuration.' };
  }

  async list(ownerId: string) {
    return this.domainRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
      relations: ['application'],
    });
  }

  async update(id: string, ownerId: string, dto: { applicationId?: string; settings?: any }) {
    const domain = await this.getOwnedDomain(id, ownerId);
    if (dto.applicationId !== undefined) domain.applicationId = dto.applicationId;
    if (dto.settings) domain.settings = { ...domain.settings, ...dto.settings };
    return this.domainRepo.save(domain);
  }

  async remove(id: string, ownerId: string) {
    const domain = await this.getOwnedDomain(id, ownerId);
    await this.domainRepo.remove(domain);

    await this.audit.log({
      userId: ownerId,
      action: 'custom_domain.deleted',
      resource: 'custom_domain',
      resourceId: id,
      details: { domain: domain.domain },
    });

    return { deleted: true };
  }

  async findByDomain(domain: string): Promise<CustomDomain | null> {
    return this.domainRepo.findOne({
      where: { domain: domain.toLowerCase(), status: DomainStatus.ACTIVE },
      relations: ['application'],
    });
  }

  private async getOwnedDomain(id: string, ownerId: string): Promise<CustomDomain> {
    const domain = await this.domainRepo.findOne({ where: { id } });
    if (!domain) throw new NotFoundException('Domain not found');
    if (domain.ownerId !== ownerId) throw new ForbiddenException();
    return domain;
  }
}
