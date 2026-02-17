/**
 * Plugin Lifecycle Manager
 *
 * Manages the lifecycle of installed plugins per application:
 * install → activate → deactivate → uninstall
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HookEngine } from '../../hooks/hook.engine';
import {
  InstalledPlugin,
  InstalledPluginStatus,
} from '../../../database/entities/installed-plugin.entity';

@Injectable()
export class PluginManager {
  private readonly logger = new Logger(PluginManager.name);

  constructor(
    @InjectRepository(InstalledPlugin)
    private readonly installedRepo: Repository<InstalledPlugin>,
    private readonly hookEngine: HookEngine,
  ) {}

  async install(applicationId: string, pluginId: string): Promise<InstalledPlugin> {
    const existing = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (existing) {
      this.logger.warn(`Plugin ${pluginId} already installed for app ${applicationId}`);
      return existing;
    }

    const installed = this.installedRepo.create({
      applicationId,
      pluginId,
      status: InstalledPluginStatus.ACTIVE,
      settings: {},
    });
    const saved = await this.installedRepo.save(installed);

    await this.hookEngine.doAction('plugin:installed', { applicationId, pluginId });
    this.logger.log(`Plugin installed: ${pluginId} for app ${applicationId}`);
    return saved;
  }

  async activate(applicationId: string, pluginId: string): Promise<InstalledPlugin> {
    const installed = await this.findInstalled(applicationId, pluginId);
    installed.status = InstalledPluginStatus.ACTIVE;
    const saved = await this.installedRepo.save(installed);
    await this.hookEngine.doAction('plugin:activated', { applicationId, pluginId });
    this.logger.log(`Plugin activated: ${pluginId} for app ${applicationId}`);
    return saved;
  }

  async deactivate(applicationId: string, pluginId: string): Promise<InstalledPlugin> {
    const installed = await this.findInstalled(applicationId, pluginId);
    installed.status = InstalledPluginStatus.INACTIVE;
    const saved = await this.installedRepo.save(installed);
    this.hookEngine.removePluginHooks(pluginId);
    await this.hookEngine.doAction('plugin:deactivated', { applicationId, pluginId });
    this.logger.log(`Plugin deactivated: ${pluginId} for app ${applicationId}`);
    return saved;
  }

  async uninstall(applicationId: string, pluginId: string): Promise<void> {
    const installed = await this.findInstalled(applicationId, pluginId);
    this.hookEngine.removePluginHooks(pluginId);
    await this.installedRepo.remove(installed);
    await this.hookEngine.doAction('plugin:uninstalled', { applicationId, pluginId });
    this.logger.log(`Plugin uninstalled: ${pluginId} from app ${applicationId}`);
  }

  async listInstalled(applicationId: string): Promise<InstalledPlugin[]> {
    return this.installedRepo.find({
      where: { applicationId },
      relations: ['plugin'],
      order: { executionOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async listActive(applicationId: string): Promise<InstalledPlugin[]> {
    return this.installedRepo.find({
      where: { applicationId, status: InstalledPluginStatus.ACTIVE },
      relations: ['plugin'],
      order: { executionOrder: 'ASC' },
    });
  }

  async updateSettings(
    applicationId: string,
    pluginId: string,
    settings: Record<string, any>,
  ): Promise<InstalledPlugin> {
    const installed = await this.findInstalled(applicationId, pluginId);
    installed.settings = { ...installed.settings, ...settings };
    return this.installedRepo.save(installed);
  }

  private async findInstalled(
    applicationId: string,
    pluginId: string,
  ): Promise<InstalledPlugin> {
    const installed = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
      relations: ['plugin'],
    });
    if (!installed) {
      throw new NotFoundException('Plugin is not installed for this application');
    }
    return installed;
  }
}
