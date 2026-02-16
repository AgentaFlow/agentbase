import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from '../../database/entities';

@Injectable()
export class ThemesService {
  constructor(
    @InjectRepository(Theme)
    private readonly themeRepo: Repository<Theme>,
  ) {}

  async create(data: Partial<Theme>): Promise<Theme> {
    const existing = await this.themeRepo.findOne({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Theme slug already exists');

    const theme = this.themeRepo.create(data);
    return this.themeRepo.save(theme);
  }

  async findAll(): Promise<Theme[]> {
    return this.themeRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Theme> {
    const theme = await this.themeRepo.findOne({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');
    return theme;
  }

  async update(id: string, data: Partial<Theme>): Promise<Theme> {
    const theme = await this.findById(id);
    Object.assign(theme, data);
    return this.themeRepo.save(theme);
  }

  async delete(id: string): Promise<void> {
    const theme = await this.findById(id);
    await this.themeRepo.remove(theme);
  }
}
