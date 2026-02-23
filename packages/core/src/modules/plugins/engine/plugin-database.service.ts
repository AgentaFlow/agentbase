import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  PluginData,
  PluginDataDocument,
} from "../../../database/schemas/plugin-data.schema";

/**
 * Scoped database service for plugins.
 * Provides key-value store operations scoped to a plugin + application.
 */
@Injectable()
export class PluginDatabaseService {
  private readonly logger = new Logger(PluginDatabaseService.name);

  constructor(
    @InjectModel(PluginData.name)
    private readonly pluginDataModel: Model<PluginDataDocument>,
  ) {}

  /**
   * Set a key-value pair for a plugin in an application context.
   */
  async set(
    pluginId: string,
    applicationId: string,
    key: string,
    value: any,
  ): Promise<void> {
    await this.pluginDataModel.updateOne(
      { pluginId, applicationId, key },
      { $set: { value } },
      { upsert: true },
    );
  }

  /**
   * Get a value by key.
   */
  async get(
    pluginId: string,
    applicationId: string,
    key: string,
  ): Promise<any> {
    const doc = await this.pluginDataModel.findOne({
      pluginId,
      applicationId,
      key,
    });
    return doc?.value ?? null;
  }

  /**
   * Delete a key.
   */
  async delete(
    pluginId: string,
    applicationId: string,
    key: string,
  ): Promise<boolean> {
    const result = await this.pluginDataModel.deleteOne({
      pluginId,
      applicationId,
      key,
    });
    return result.deletedCount > 0;
  }

  /**
   * List all keys for a plugin (optionally filtered by prefix).
   */
  async keys(
    pluginId: string,
    applicationId: string,
    prefix?: string,
  ): Promise<string[]> {
    const filter: any = { pluginId, applicationId };
    if (prefix) {
      filter.key = { $regex: `^${prefix}` };
    }
    const docs = await this.pluginDataModel.find(filter).select("key").exec();
    return docs.map((d) => d.key);
  }

  /**
   * Query plugin data with filtering.
   */
  async find(
    pluginId: string,
    applicationId: string,
    filter: Record<string, any>,
    options?: { limit?: number; skip?: number; sort?: Record<string, 1 | -1> },
  ): Promise<any[]> {
    const query = this.pluginDataModel.find({
      pluginId,
      applicationId,
      ...this.prefixValueFilter(filter),
    });

    if (options?.sort) query.sort(options.sort);
    if (options?.skip) query.skip(options.skip);
    if (options?.limit) query.limit(options.limit);

    const docs = await query.exec();
    return docs.map((d) => ({ key: d.key, value: d.value }));
  }

  /**
   * Count documents matching a filter.
   */
  async count(
    pluginId: string,
    applicationId: string,
    filter: Record<string, any>,
  ): Promise<number> {
    return this.pluginDataModel.countDocuments({
      pluginId,
      applicationId,
      ...this.prefixValueFilter(filter),
    });
  }

  /**
   * Delete all data for a plugin in an application.
   */
  async deleteAll(pluginId: string, applicationId: string): Promise<number> {
    const result = await this.pluginDataModel.deleteMany({
      pluginId,
      applicationId,
    });
    return result.deletedCount;
  }

  /**
   * Prefix filter keys with 'value.' for querying nested value fields.
   */
  private prefixValueFilter(filter: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(filter)) {
      result[`value.${key}`] = val;
    }
    return result;
  }
}
