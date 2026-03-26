import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import {
  InstalledPlugin,
  InstalledPluginStatus,
} from "../../database/entities";
import { MarketplaceClientService } from "./marketplace-client.service";

@Injectable()
export class UpdateManagerService {
  private readonly logger = new Logger(UpdateManagerService.name);

  constructor(
    private readonly marketplaceClient: MarketplaceClientService,
    private readonly config: ConfigService,
    @InjectRepository(InstalledPlugin)
    private readonly installedRepo: Repository<InstalledPlugin>,
  ) {}

  /**
   * Returns the number of installed plugins that have an available update.
   * Reads from `settings.availableUpdate` which is populated by the daily cron.
   */
  async getUpdateCount(): Promise<number> {
    const installed = await this.installedRepo.find({
      where: { status: InstalledPluginStatus.ACTIVE },
    });
    return installed.filter((p) => p.settings?.availableUpdate != null).length;
  }

  /**
   * Returns the list of installed plugins that have available updates,
   * with update metadata from `settings.availableUpdate`.
   */
  async getAvailableUpdates(): Promise<
    {
      installedPluginId: string;
      pluginId: string;
      marketplacePluginId: string;
      latestVersion: string;
      currentVersion: string;
      changelog: string;
    }[]
  > {
    const installed = await this.installedRepo.find({
      where: { status: InstalledPluginStatus.ACTIVE },
    });

    return installed
      .filter((p) => p.settings?.availableUpdate != null)
      .map((p) => ({
        installedPluginId: p.id,
        pluginId: p.pluginId,
        marketplacePluginId:
          (p.settings?.marketplacePluginId as string) ?? p.pluginId,
        latestVersion: p.settings.availableUpdate.latestVersion as string,
        currentVersion: (p.settings?.installedVersion as string) ?? "unknown",
        changelog: (p.settings.availableUpdate.changelog as string) ?? "",
      }));
  }

  /**
   * Mark an installed plugin as updated (clears the availableUpdate flag and
   * records the new version in settings).
   *
   * Called after the in-process plugin upgrade completes successfully.
   */
  async markUpdated(
    installedPluginId: string,
    newVersion: string,
  ): Promise<void> {
    const installed = await this.installedRepo.findOne({
      where: { id: installedPluginId },
    });
    if (!installed) return;

    installed.settings = {
      ...installed.settings,
      installedVersion: newVersion,
      availableUpdate: null,
    };
    await this.installedRepo.save(installed);
    this.logger.log(
      `Plugin ${installed.pluginId} updated to ${newVersion} on installation ${installedPluginId}`,
    );
  }

  /**
   * Daily background job: ping the marketplace for each active installation and
   * store available updates in `InstalledPlugin.settings.availableUpdate`.
   *
   * Only runs when AGENTBASE_INSTANCE_ID and MARKETPLACE_INTERNAL_HMAC_SECRET
   * are configured.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async checkForUpdates(): Promise<void> {
    const instanceId = this.config.get<string>("AGENTBASE_INSTANCE_ID", "");
    const hmacSecret = this.config.get<string>(
      "MARKETPLACE_INTERNAL_HMAC_SECRET",
      "",
    );

    if (!instanceId || !hmacSecret) {
      this.logger.debug(
        "AGENTBASE_INSTANCE_ID or MARKETPLACE_INTERNAL_HMAC_SECRET not set — skipping update check",
      );
      return;
    }

    this.logger.log("Checking for plugin updates from marketplace...");

    let result: {
      updates: { pluginId: string; latestVersion: string; changelog: string }[];
    };
    try {
      result = await this.marketplaceClient.ping(instanceId);
    } catch {
      this.logger.warn("Marketplace ping failed — skipping update check");
      return;
    }

    if (result.updates.length === 0) {
      this.logger.log("No plugin updates available.");
      return;
    }

    // Build a lookup: marketplacePluginId → update info
    const updateMap = new Map(result.updates.map((u) => [u.pluginId, u]));

    // Find installed plugins that correspond to updated marketplace entries.
    // Marketplace plugin ID is stored in settings.marketplacePluginId when the
    // plugin is installed via the marketplace purchase/install flow.
    const installed = await this.installedRepo.find({
      where: { status: InstalledPluginStatus.ACTIVE },
    });

    let stored = 0;
    for (const inst of installed) {
      const mpId =
        (inst.settings?.marketplacePluginId as string | undefined) ??
        inst.pluginId;

      const update = updateMap.get(mpId);
      if (!update) continue;

      inst.settings = {
        ...inst.settings,
        availableUpdate: {
          latestVersion: update.latestVersion,
          changelog: update.changelog,
        },
      };
      await this.installedRepo.save(inst);
      stored++;
    }

    this.logger.log(
      `Update check complete — ${result.updates.length} update(s) from marketplace, ${stored} matched local installation(s).`,
    );
  }
}
