import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plugin, PluginStatus } from '../../database/entities';
import { CreatePluginDto } from './dto/create-plugin.dto';

@Injectable()
export class PluginsService {
  constructor(
    @InjectRepository(Plugin)
    private readonly pluginRepo: Repository<Plugin>,
  ) {}

  async create(dto: CreatePluginDto): Promise<Plugin> {
    const existing = await this.pluginRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Plugin slug already exists');

    const plugin = this.pluginRepo.create(dto);
    return this.pluginRepo.save(plugin);
  }

  async findAll(status?: PluginStatus): Promise<Plugin[]> {
    const where = status ? { status } : {};
    return this.pluginRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Plugin> {
    const plugin = await this.pluginRepo.findOne({ where: { id } });
    if (!plugin) throw new NotFoundException('Plugin not found');
    return plugin;
  }

  async findBySlug(slug: string): Promise<Plugin> {
    const plugin = await this.pluginRepo.findOne({ where: { slug } });
    if (!plugin) throw new NotFoundException('Plugin not found');
    return plugin;
  }

  async update(id: string, data: Partial<Plugin>): Promise<Plugin> {
    const plugin = await this.findById(id);
    Object.assign(plugin, data);
    return this.pluginRepo.save(plugin);
  }

  async delete(id: string): Promise<void> {
    const plugin = await this.findById(id);
    await this.pluginRepo.remove(plugin);
  }

  async publish(id: string): Promise<Plugin> {
    return this.update(id, { status: PluginStatus.PUBLISHED });
  }

  async deprecate(id: string): Promise<Plugin> {
    return this.update(id, { status: PluginStatus.DEPRECATED });
  }
}
