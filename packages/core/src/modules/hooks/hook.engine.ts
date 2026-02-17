import { Injectable, Logger } from '@nestjs/common';

/**
 * HookEngine provides a WordPress-style action/filter system.
 *
 * Actions: Fire-and-forget callbacks triggered at specific lifecycle points.
 * Filters: Transform data through a pipeline of registered callbacks.
 *
 * Built-in hooks:
 *   Actions: app:init, app:request, conversation:start, conversation:end,
 *            plugin:activate, plugin:deactivate, user:login, user:register
 *   Filters: response:modify, prompt:modify, message:beforeSend,
 *            message:afterReceive, config:modify, theme:modify
 */

export type ActionCallback = (context: HookContext, ...args: any[]) => Promise<void> | void;
export type FilterCallback = (context: HookContext, value: any, ...args: any[]) => Promise<any> | any;

export interface HookContext {
  applicationId?: string;
  userId?: string;
  pluginId?: string;
  config?: Record<string, any>;
}

interface RegisteredHook {
  pluginId: string;
  callback: ActionCallback | FilterCallback;
  priority: number;
}

@Injectable()
export class HookEngine {
  private readonly logger = new Logger(HookEngine.name);
  private actions = new Map<string, RegisteredHook[]>();
  private filters = new Map<string, RegisteredHook[]>();

  /**
   * Register an action hook.
   * Actions are fire-and-forget — they don't return values.
   */
  registerAction(
    hookName: string,
    pluginId: string,
    callback: ActionCallback,
    priority: number = 10,
  ): void {
    const hooks = this.actions.get(hookName) || [];
    hooks.push({ pluginId, callback, priority });
    hooks.sort((a, b) => a.priority - b.priority);
    this.actions.set(hookName, hooks);
    this.logger.debug(`Action registered: ${hookName} by plugin ${pluginId} (priority: ${priority})`);
  }

  /**
   * Register a filter hook.
   * Filters transform a value through a pipeline.
   */
  registerFilter(
    filterName: string,
    pluginId: string,
    callback: FilterCallback,
    priority: number = 10,
  ): void {
    const hooks = this.filters.get(filterName) || [];
    hooks.push({ pluginId, callback, priority });
    hooks.sort((a, b) => a.priority - b.priority);
    this.filters.set(filterName, hooks);
    this.logger.debug(`Filter registered: ${filterName} by plugin ${pluginId} (priority: ${priority})`);
  }

  /**
   * Execute all callbacks registered for an action.
   */
  async doAction(
    hookName: string,
    context: HookContext,
    ...args: any[]
  ): Promise<void> {
    const hooks = this.actions.get(hookName) || [];
    for (const hook of hooks) {
      try {
        const callback = hook.callback as ActionCallback;
        await callback(context, ...args);
      } catch (error) {
        this.logger.error(
          `Action hook error: ${hookName} from plugin ${hook.pluginId}: ${error}`,
        );
      }
    }
  }

  /**
   * Pass a value through all registered filter callbacks.
   */
  async applyFilter(
    filterName: string,
    context: HookContext,
    value: any,
    ...args: any[]
  ): Promise<any> {
    const hooks = this.filters.get(filterName) || [];
    let result = value;
    for (const hook of hooks) {
      try {
        result = await (hook.callback as FilterCallback)(context, result, ...args);
      } catch (error) {
        this.logger.error(
          `Filter hook error: ${filterName} from plugin ${hook.pluginId}: ${error}`,
        );
      }
    }
    return result;
  }

  /**
   * Remove all hooks registered by a specific plugin.
   */
  removePluginHooks(pluginId: string): void {
    for (const [name, hooks] of this.actions) {
      this.actions.set(name, hooks.filter((h) => h.pluginId !== pluginId));
    }
    for (const [name, hooks] of this.filters) {
      this.filters.set(name, hooks.filter((h) => h.pluginId !== pluginId));
    }
    this.logger.log(`All hooks removed for plugin: ${pluginId}`);
  }

  /**
   * Check if any hooks are registered for a given name.
   */
  hasAction(hookName: string): boolean {
    return (this.actions.get(hookName) || []).length > 0;
  }

  hasFilter(filterName: string): boolean {
    return (this.filters.get(filterName) || []).length > 0;
  }

  /**
   * Get a summary of all registered hooks (for debugging/admin).
   */
  getRegisteredHooks(): {
    actions: Record<string, { pluginId: string; priority: number }[]>;
    filters: Record<string, { pluginId: string; priority: number }[]>;
  } {
    const actions: Record<string, any[]> = {};
    for (const [name, hooks] of this.actions) {
      actions[name] = hooks.map((h) => ({
        pluginId: h.pluginId,
        priority: h.priority,
      }));
    }
    const filters: Record<string, any[]> = {};
    for (const [name, hooks] of this.filters) {
      filters[name] = hooks.map((h) => ({
        pluginId: h.pluginId,
        priority: h.priority,
      }));
    }
    return { actions, filters };
  }
}
