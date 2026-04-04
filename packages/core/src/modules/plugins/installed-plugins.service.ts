import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  InstalledPlugin,
  InstalledPluginStatus,
  Plugin,
  Application,
} from "../../database/entities";
import { HookEngine } from "../hooks/hook.engine";
import { LicenseValidatorService } from "../marketplace/license-validator.service";
import {
  encryptSetting,
  decryptSetting,
} from "./engine/plugin-settings-crypto";

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
    @Optional()
    private readonly licenseValidator: LicenseValidatorService | null,
  ) {}

  async install(
    applicationId: string,
    pluginId: string,
    ownerId: string,
  ): Promise<InstalledPlugin> {
    // Verify app ownership
    const app = await this.appRepo.findOne({
      where: { id: applicationId, ownerId },
    });
    if (!app) throw new NotFoundException("Application not found");

    // Verify plugin exists
    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    if (!plugin) throw new NotFoundException("Plugin not found");

    // Check if already installed
    const existing = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (existing)
      throw new ConflictException(
        "Plugin already installed on this application",
      );

    const installed = this.installedRepo.create({
      applicationId,
      pluginId,
      status: InstalledPluginStatus.ACTIVE,
      settings: plugin.manifest?.settings || {},
    });

    const result = await this.installedRepo.save(installed);

    // Increment download count
    await this.pluginRepo.increment({ id: pluginId }, "downloadCount", 1);

    // Validate license for paid plugins
    if (
      this.licenseValidator &&
      result.settings?.isPaid === true &&
      result.settings?.licenseKey
    ) {
      const valid = await this.licenseValidator.validate(
        result.settings.licenseKey as string,
        result,
      );
      if (!valid) {
        this.logger.warn(
          `License validation failed for plugin ${pluginId} — installed but left inactive.`,
        );
        result.status = InstalledPluginStatus.INACTIVE;
        await this.installedRepo.save(result);
      }
    }

    // Fire activation hook
    await this.hookEngine.doAction("plugin:activate", {
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
    const app = await this.appRepo.findOne({
      where: { id: applicationId, ownerId },
    });
    if (!app) throw new NotFoundException("Application not found");

    const installed = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (!installed) throw new NotFoundException("Plugin not installed");

    // Fire deactivation hook
    await this.hookEngine.doAction("plugin:deactivate", {
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

    await this.hookEngine.doAction("plugin:activate", {
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

    await this.hookEngine.doAction("plugin:deactivate", {
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

    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    const settingDefs = plugin?.manifest?.settings ?? {};

    const encryptedSettings: Record<string, any> = {};
    for (const [key, value] of Object.entries(settings)) {
      const def = settingDefs[key];
      if (def?.encrypted === true && typeof value === "string") {
        encryptedSettings[key] = encryptSetting(value);
      } else {
        encryptedSettings[key] = value;
      }
    }

    installed.settings = { ...installed.settings, ...encryptedSettings };
    return this.installedRepo.save(installed);
  }

  /**
   * Returns the plugin's settings with encrypted fields decrypted.
   * Use this when constructing a PluginContext so plugins receive plaintext values.
   */
  async getSettingsForContext(
    applicationId: string,
    pluginId: string,
  ): Promise<Record<string, any>> {
    const installed = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (!installed) return {};

    const plugin = await this.pluginRepo.findOne({ where: { id: pluginId } });
    const settingDefs = plugin?.manifest?.settings ?? {};

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(installed.settings ?? {})) {
      const def = settingDefs[key];
      if (def?.encrypted === true && typeof value === "string") {
        try {
          result[key] = decryptSetting(value);
        } catch {
          this.logger.warn(
            `Failed to decrypt setting "${key}" for plugin ${pluginId}`,
          );
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async getInstalledPlugins(
    applicationId: string,
    ownerId: string,
  ): Promise<InstalledPlugin[]> {
    const app = await this.appRepo.findOne({
      where: { id: applicationId, ownerId },
    });
    if (!app) throw new NotFoundException("Application not found");

    return this.installedRepo.find({
      where: { applicationId },
      relations: ["plugin"],
      order: { executionOrder: "ASC" },
    });
  }

  async getActivePlugins(applicationId: string): Promise<InstalledPlugin[]> {
    return this.installedRepo.find({
      where: { applicationId, status: InstalledPluginStatus.ACTIVE },
      relations: ["plugin"],
      order: { executionOrder: "ASC" },
    });
  }

  private async getInstalled(
    applicationId: string,
    pluginId: string,
    ownerId: string,
  ): Promise<InstalledPlugin> {
    const app = await this.appRepo.findOne({
      where: { id: applicationId, ownerId },
    });
    if (!app) throw new NotFoundException("Application not found");

    const installed = await this.installedRepo.findOne({
      where: { applicationId, pluginId },
    });
    if (!installed) throw new NotFoundException("Plugin not installed");

    return installed;
  }
}
