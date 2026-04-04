/**
 * Agentbase Plugin Test Utilities
 *
 * Provides mock factories for unit-testing plugins without a live Agentbase
 * instance. Import from your plugin's test files:
 *
 * ```ts
 * import { createMockPluginAPI, createMockHookEngine, MockPluginContext } from '@agentbase/plugin-test-utils';
 * ```
 */

import type {
  PluginAPI,
  PluginContext,
  PluginDatabaseAPI,
  PluginEventBus,
  EndpointDefinition,
  CronJobDefinition,
  WebhookDefinition,
  AdminPageDefinition,
  FilterCallback,
  HookCallback,
} from "../sdk/src/index";

// ─── Re-export for convenience ────────────────────────────────────────────────

export type { PluginContext as MockPluginContext };

// ─── Mock database ────────────────────────────────────────────────────────────

export interface MockPluginDatabaseAPI extends PluginDatabaseAPI {
  /** Inspect or seed the in-memory store directly. */
  _store: Map<string, unknown>;
}

export function createMockDB(): MockPluginDatabaseAPI {
  const store = new Map<string, unknown>();

  return {
    _store: store,

    async set(key: string, value: unknown): Promise<void> {
      store.set(key, value);
    },

    async get(key: string): Promise<unknown> {
      return store.get(key) ?? null;
    },

    async delete(key: string): Promise<boolean> {
      return store.delete(key);
    },

    async keys(prefix?: string): Promise<string[]> {
      const all = Array.from(store.keys());
      return prefix ? all.filter((k) => k.startsWith(prefix)) : all;
    },

    async find(
      filter: Record<string, unknown>,
      options?: {
        limit?: number;
        skip?: number;
        sort?: Record<string, 1 | -1>;
      },
    ): Promise<unknown[]> {
      let results = Array.from(store.values()).filter((v) => {
        if (typeof v !== "object" || v === null) return false;
        return Object.entries(filter).every(
          ([k, val]) => (v as Record<string, unknown>)[k] === val,
        );
      });

      const skip = options?.skip ?? 0;
      const limit = options?.limit;

      results = results.slice(skip);
      if (limit !== undefined) results = results.slice(0, limit);

      if (options?.sort) {
        const [sortKey, dir] = Object.entries(options.sort)[0];
        results.sort((a, b) => {
          const av = (a as Record<string, unknown>)[sortKey];
          const bv = (b as Record<string, unknown>)[sortKey];
          if (av === bv) return 0;
          const cmp = av! < bv! ? -1 : 1;
          return dir === 1 ? cmp : -cmp;
        });
      }

      return results;
    },

    async count(filter: Record<string, unknown>): Promise<number> {
      return Array.from(store.values()).filter((v) => {
        if (typeof v !== "object" || v === null) return false;
        return Object.entries(filter).every(
          ([k, val]) => (v as Record<string, unknown>)[k] === val,
        );
      }).length;
    },
  };
}

// ─── Mock event bus ───────────────────────────────────────────────────────────

export interface MockPluginEventBus extends PluginEventBus {
  /** All events that have been emitted, in order. */
  _emitted: Array<{ event: string; data: unknown }>;
}

export function createMockEventBus(): MockPluginEventBus {
  const emitted: Array<{ event: string; data: unknown }> = [];
  const handlers = new Map<
    string,
    Set<(data: unknown) => Promise<void> | void>
  >();

  return {
    _emitted: emitted,

    async emit(event: string, data: unknown): Promise<void> {
      emitted.push({ event, data });
      const set = handlers.get(event);
      if (set) {
        for (const h of set) {
          await h(data);
        }
      }
    },

    on(event: string, handler: (data: unknown) => Promise<void> | void): void {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },

    off(event: string, handler: (data: unknown) => Promise<void> | void): void {
      handlers.get(event)?.delete(handler);
    },
  };
}

// ─── Mock PluginAPI ───────────────────────────────────────────────────────────

export interface MockPluginAPIOptions {
  /** Seed config values available via `getConfig`. */
  config?: Record<string, unknown>;
  /** Override the default fetch-based `makeRequest` with a custom stub. */
  makeRequest?: jest.Mock;
}

export interface MockPluginAPI extends PluginAPI {
  db: MockPluginDatabaseAPI;
  events: MockPluginEventBus;
  /** All log calls recorded as `{ message, level }` tuples. */
  _logs: Array<{ message: string; level: "info" | "warn" | "error" }>;
  /** All endpoints registered via `registerEndpoint`. */
  _endpoints: EndpointDefinition[];
  /** All cron jobs registered via `registerCronJob`. */
  _cronJobs: CronJobDefinition[];
  /** All webhooks registered via `registerWebhook`. */
  _webhooks: WebhookDefinition[];
  /** All admin pages registered via `registerAdminPage`. */
  _adminPages: AdminPageDefinition[];
  /** The mutable config store (read/write via `getConfig`/`setConfig`). */
  _config: Record<string, unknown>;
}

export function createMockPluginAPI(
  options: MockPluginAPIOptions = {},
): MockPluginAPI {
  const config: Record<string, unknown> = { ...(options.config ?? {}) };
  const logs: Array<{ message: string; level: "info" | "warn" | "error" }> = [];
  const endpoints: EndpointDefinition[] = [];
  const cronJobs: CronJobDefinition[] = [];
  const webhooks: WebhookDefinition[] = [];
  const adminPages: AdminPageDefinition[] = [];
  const db = createMockDB();
  const events = createMockEventBus();

  const makeRequest: jest.Mock =
    options.makeRequest ??
    jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

  return {
    _logs: logs,
    _endpoints: endpoints,
    _cronJobs: cronJobs,
    _webhooks: webhooks,
    _adminPages: adminPages,
    _config: config,
    db,
    events,

    getConfig(key: string): unknown {
      return config[key] ?? null;
    },

    async setConfig(key: string, value: unknown): Promise<void> {
      config[key] = value;
    },

    makeRequest,

    log(message: string, level: "info" | "warn" | "error" = "info"): void {
      logs.push({ message, level });
    },

    registerEndpoint(definition: EndpointDefinition): void {
      endpoints.push(definition);
    },

    registerCronJob(definition: CronJobDefinition): void {
      cronJobs.push(definition);
    },

    registerWebhook(definition: WebhookDefinition): void {
      webhooks.push(definition);
    },

    registerAdminPage(definition: AdminPageDefinition): void {
      adminPages.push(definition);
    },
  };
}

// ─── Mock PluginContext ───────────────────────────────────────────────────────

export interface CreateMockContextOptions {
  appId?: string;
  userId?: string;
  config?: Record<string, unknown>;
  api?: Partial<MockPluginAPI>;
}

export function createMockPluginContext(
  options: CreateMockContextOptions = {},
): PluginContext & { api: MockPluginAPI } {
  const api = createMockPluginAPI({ config: options.config });
  if (options.api) {
    Object.assign(api, options.api);
  }
  return {
    appId: options.appId ?? "test-app-id",
    userId: options.userId ?? "test-user-id",
    config: options.config ?? {},
    api,
  };
}

// ─── Mock hook engine ─────────────────────────────────────────────────────────

export interface MockHookEngine {
  /**
   * Fire an action hook and await all registered handlers.
   * Mirrors `doAction()` from the SDK.
   */
  fireAction(
    hookName: string,
    context: PluginContext,
    ...args: unknown[]
  ): Promise<void>;

  /**
   * Run a filter chain and return the final transformed value.
   * Mirrors `applyFilter()` from the SDK.
   */
  applyFilter(
    filterName: string,
    context: PluginContext,
    value: unknown,
    ...args: unknown[]
  ): Promise<unknown>;

  /** Register a hook handler (equivalent to attaching a plugin's hook). */
  onAction(hookName: string, callback: HookCallback): void;

  /** Register a filter handler. */
  onFilter(filterName: string, callback: FilterCallback): void;

  /** All action invocations recorded as `{ hookName, args }` tuples. */
  _actionCalls: Array<{ hookName: string; args: unknown[] }>;

  /** All filter invocations recorded as `{ filterName, inputValue }` tuples. */
  _filterCalls: Array<{ filterName: string; inputValue: unknown }>;

  /** Remove all registered handlers and clear call records. */
  reset(): void;
}

export function createMockHookEngine(): MockHookEngine {
  const actionHandlers = new Map<string, HookCallback[]>();
  const filterHandlers = new Map<string, FilterCallback[]>();
  const actionCalls: Array<{ hookName: string; args: unknown[] }> = [];
  const filterCalls: Array<{ filterName: string; inputValue: unknown }> = [];

  return {
    _actionCalls: actionCalls,
    _filterCalls: filterCalls,

    onAction(hookName: string, callback: HookCallback): void {
      const list = actionHandlers.get(hookName) ?? [];
      list.push(callback);
      actionHandlers.set(hookName, list);
    },

    onFilter(filterName: string, callback: FilterCallback): void {
      const list = filterHandlers.get(filterName) ?? [];
      list.push(callback);
      filterHandlers.set(filterName, list);
    },

    async fireAction(
      hookName: string,
      context: PluginContext,
      ...args: unknown[]
    ): Promise<void> {
      actionCalls.push({ hookName, args });
      const handlers = actionHandlers.get(hookName) ?? [];
      for (const h of handlers) {
        await h(context, ...args);
      }
    },

    async applyFilter(
      filterName: string,
      context: PluginContext,
      value: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      filterCalls.push({ filterName, inputValue: value });
      const handlers = filterHandlers.get(filterName) ?? [];
      let result = value;
      for (const h of handlers) {
        result = await h(context, result, ...args);
      }
      return result;
    },

    reset(): void {
      actionHandlers.clear();
      filterHandlers.clear();
      actionCalls.length = 0;
      filterCalls.length = 0;
    },
  };
}
