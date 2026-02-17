import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InstalledPlugin,
  InstalledPluginStatus,
  Plugin,
  Application,
} from '../../database/entities';
import { HookEngine } from '../hooks/hook.engine';

@Injectable()
export class InstalledPluginsService {
  private readonly logger = new Logger(InstalledPluginsService.name);

  constructor(
    @InjectRepository(InstalledPlugin)
    private readonly installedRepo: Repository<InstalledPlugin>,
    @InjectRepository(Plugin)
    private readonly pluginRepo: Repository<Plugin>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    private readonly hookEngine: HookEngine,
  ) {}

  async install(
    applicationId: string,
    pluginId: string,
    ownerId: string,
  ): Promise<InstalledPlugin> {
    // Verify app ownership
    const app = await this.appRepo.findOne({ where: { id: applicationId, ownerId } });
    if (!app) throw new NotFoundException('Application not found');

    // Verify plugin exists
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException('Plugin not found');

    // Check if already installed
    const existing = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (existing) throw new ConflictException('Plugin already installed on this application');

    const installed = this.installedRepo.create({
      applicationId,
      pluginId,
      status: InstalledPluginStatus.ACTIVE,
      settings: plugin.manifest?.settings || {},
    });

    const result = await this.installedRepo.save(installed);

    // Fire activation hook
    await this.hookEngine.doAction('plugin:activate', {
      applicationId,
      pluginId,
    });

    this.logger.log(`Plugin ${plugin.name} installed on app ${app.name}`);
    return result;
  }

  async uninstall(
    applicationId: string,
    pluginId: string,
    ownerId: string,
  ): Promise<void> {
    const app = await this.appRepo.findOne({ where: { id: applicationId, ownerId } });
    if (!app) throw new NotFoundException('Application not found');

    const installed = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (!installed) throw new NotFoundException('Plugin not installed');

    // Fire deactivation hook
    await this.hookEngine.doAction('plugin:deactivate', {
      applicationId,
      pluginId,
    });

    // Remove hooks registered by this plugin
    this.hookEngine.removePluginHooks(pluginId);

    await this.installedRepo.remove(installed);
    this.logger.log(`Plugin ${pluginId} uninstalled from app ${applicationId}`);
  }

  async activate(
    applicationId: string,
    pluginId: string,
    ownerId: string,
  ): Promise<InstalledPlugin> {
    const installed = await this.getInstalled(applicationId, pluginId, ownerId);
    installed.status = InstalledPluginStatus.ACTIVE;
    const result = await this.installedRepo.save(installed);

    await this.hookEngine.doAction('plugin:activate', {
      applicationId,
      pluginId,
    });

    return result;
  }

  async deactivate(
    applicationId: string,
    pluginId: string,
    ownerId: string,
  ): Promise<InstalledPlugin> {
    const installed = await this.getInstalled(applicationId, pluginId, ownerId);
    installed.status = InstalledPluginStatus.INACTIVE;
    const result = await this.installedRepo.save(installed);

    await this.hookEngine.doAction('plugin:deactivate', {
      applicationId,
      pluginId,
    });

    this.hookEngine.removePluginHooks(pluginId);
    return result;
  }

  async updateSettings(
    applicationId: string,
    pluginId: string,
    ownerId: string,
    settings: Record<string, any>,
  ): Promise<InstalledPlugin> {
    const installed = await this.getInstalled(applicationId, pluginId, ownerId);
    installed.settings = { ...installed.settings, ...settings };
    return this.installedRepo.save(installed);
  }

  async getInstalledPlugins(
    applicationId: string,
    ownerId: string,
  ): Promise<InstalledPlugin[]> {
    const app = await this.appRepo.findOne({ where: { id: applicationId, ownerId } });
    if (!app) throw new NotFoundException('Application not found');

    return this.installedRepo.find({
      where: { applicationId },
      relations: ['plugin'],
      order: { executionOrder: 'ASC' },
    });
  }

  async getActivePlugins(applicationId: string): Promise<InstalledPlugin[]> {
    return this.installedRepo.find({
      where: { applicationId, status: InstalledPluginStatus.ACTIVE },
      relations: ['plugin'],
      order: { executionOrder: 'ASC' },
    });
  }

  private async getInstalled(
    applicationId: string,
    pluginId: string,
    ownerId: string,
  ): Promise<InstalledPlugin> {
    const app = await this.appRepo.findOne({ where: { id: applicationId, ownerId } });
    if (!app) throw new NotFoundException('Application not found');

    const installed = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (!installed) throw new NotFoundException('Plugin not installed');

    return installed;
  }
}
