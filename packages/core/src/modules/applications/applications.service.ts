import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../../database/entities';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
  ) {}

  async create(ownerId: string, dto: CreateApplicationDto): Promise<Application> {
    const slug = this.generateSlug(dto.name);
    const app = this.appRepo.create({
      ...dto,
      slug,
      ownerId,
    });
    return this.appRepo.save(app);
  }

  async findAllByOwner(ownerId: string): Promise<Application[]> {
    return this.appRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, ownerId?: string): Promise<Application> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (ownerId && app.ownerId !== ownerId) {
      throw new ForbiddenException('Access denied');
    }
    return app;
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateApplicationDto,
  ): Promise<Application> {
    const app = await this.findById(id, ownerId);
    Object.assign(app, dto);
    return this.appRepo.save(app);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const app = await this.findById(id, ownerId);
    await this.appRepo.remove(app);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
