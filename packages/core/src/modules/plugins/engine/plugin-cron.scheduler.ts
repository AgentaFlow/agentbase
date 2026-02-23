import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";

export interface CronJobRegistration {
  pluginId: string;
  name: string;
  schedule: string;
  handler: () => Promise<void> | void;
  timezone?: string;
}

interface RunningJob {
  pluginId: string;
  name: string;
  timer: NodeJS.Timeout;
  intervalMs: number;
}

/**
 * Simple cron-style scheduler for plugin-registered jobs.
 * Supports basic interval parsing from cron expressions.
 * For production, replace with node-cron or bull for advanced scheduling.
 */
@Injectable()
export class PluginCronScheduler implements OnModuleDestroy {
  private readonly logger = new Logger(PluginCronScheduler.name);
  private jobs: RunningJob[] = [];

  /**
   * Register and start a cron job for a plugin.
   */
  register(job: CronJobRegistration): void {
    // Remove existing job with same name
    this.removeJob(job.pluginId, job.name);

    const intervalMs = this.parseSchedule(job.schedule);
    if (intervalMs < 1000) {
      this.logger.warn(`Job ${job.name} has interval < 1s, ignoring`);
      return;
    }

    const timer = setInterval(async () => {
      try {
        await job.handler();
      } catch (error) {
        this.logger.error(
          `Cron job error (${job.pluginId}/${job.name}): ${error}`,
        );
      }
    }, intervalMs);

    this.jobs.push({
      pluginId: job.pluginId,
      name: job.name,
      timer,
      intervalMs,
    });

    this.logger.log(
      `Cron job registered: ${job.name} (plugin: ${job.pluginId}, interval: ${intervalMs}ms)`,
    );
  }

  /**
   * Remove a specific job.
   */
  removeJob(pluginId: string, name: string): void {
    const idx = this.jobs.findIndex(
      (j) => j.pluginId === pluginId && j.name === name,
    );
    if (idx !== -1) {
      clearInterval(this.jobs[idx].timer);
      this.jobs.splice(idx, 1);
    }
  }

  /**
   * Remove all jobs for a plugin.
   */
  removePluginJobs(pluginId: string): void {
    const toRemove = this.jobs.filter((j) => j.pluginId === pluginId);
    toRemove.forEach((j) => clearInterval(j.timer));
    this.jobs = this.jobs.filter((j) => j.pluginId !== pluginId);
    if (toRemove.length > 0) {
      this.logger.log(
        `Removed ${toRemove.length} cron jobs for plugin: ${pluginId}`,
      );
    }
  }

  /**
   * Get all registered jobs (for admin/debugging).
   */
  getAll(): Omit<RunningJob, "timer">[] {
    return this.jobs.map(({ timer, ...rest }) => rest);
  }

  onModuleDestroy(): void {
    this.jobs.forEach((j) => clearInterval(j.timer));
    this.jobs = [];
  }

  /**
   * Parse a basic cron schedule into milliseconds.
   * Supports: cron 5-field format (basic), or shorthand like '5m', '1h', '30s'.
   */
  private parseSchedule(schedule: string): number {
    // Shorthand formats
    const shorthand = schedule.match(/^(\d+)(s|m|h|d)$/);
    if (shorthand) {
      const value = parseInt(shorthand[1]);
      switch (shorthand[2]) {
        case "s":
          return value * 1000;
        case "m":
          return value * 60_000;
        case "h":
          return value * 3_600_000;
        case "d":
          return value * 86_400_000;
      }
    }

    // Basic cron expression parsing (minute-level granularity)
    const parts = schedule.trim().split(/\s+/);
    if (parts.length === 5) {
      const [min] = parts;
      if (min === "*") return 60_000; // every minute
      if (min.startsWith("*/")) {
        return parseInt(min.slice(2)) * 60_000; // every N minutes
      }
      // Default: run every hour
      return 3_600_000;
    }

    // Default: 1 hour
    this.logger.warn(
      `Could not parse schedule "${schedule}", defaulting to 1 hour`,
    );
    return 3_600_000;
  }
}
