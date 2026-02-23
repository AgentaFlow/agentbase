/**
 * Agentbase Plugin SDK
 *
 * Build plugins for the Agentbase platform.
 *
 * @example
 * ```ts
 * import { createPlugin } from '@agentbase/plugin-sdk';
 *
 * export default createPlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   hooks: {
 *     'app:init': async (context) => {
 *       console.log('Plugin initialized!');
 *     },
 *   },
 * });
 * ```
 */

// --- Types ---

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions?: string[];
  dependencies?: Record<string, string>;
}

export interface PluginContext {
  appId: string;
  userId: string;
  config: Record<string, any>;
  api: PluginAPI;
}

// --- Database Access API ---

export interface PluginDatabaseAPI {
  /** Store a key-value pair in the plugin's scoped storage. */
  set: (key: string, value: any) => Promise<void>;
  /** Retrieve a value by key from the plugin's scoped storage. */
  get: (key: string) => Promise<any>;
  /** Delete a key from the plugin's scoped storage. */
  delete: (key: string) => Promise<boolean>;
  /** List all keys in the plugin's scoped storage. */
  keys: (prefix?: string) => Promise<string[]>;
  /** Query the plugin's scoped collection with a filter. */
  find: (
    filter: Record<string, any>,
    options?: { limit?: number; skip?: number; sort?: Record<string, 1 | -1> },
  ) => Promise<any[]>;
  /** Count documents matching a filter. */
  count: (filter: Record<string, any>) => Promise<number>;
}

// --- Custom Endpoint Registration ---

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface EndpointRequest {
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string>;
  user?: { id: string; email: string; role: string };
}

export interface EndpointResponse {
  status: (code: number) => EndpointResponse;
  json: (data: any) => void;
  send: (data: string) => void;
}

export type EndpointHandler = (
  req: EndpointRequest,
  res: EndpointResponse,
) => Promise<void> | void;

export interface EndpointDefinition {
  method: HttpMethod;
  path: string;
  handler: EndpointHandler;
  auth?: boolean;
  description?: string;
}

// --- Scheduled Jobs / Cron ---

export interface CronJobDefinition {
  /** A unique name for the cron job. */
  name: string;
  /** Cron expression (e.g., '0 * * * *' for every hour). */
  schedule: string;
  /** The function to execute on schedule. */
  handler: (context: PluginContext) => Promise<void> | void;
  /** Optional timezone (e.g., 'America/New_York'). */
  timezone?: string;
}

// --- Webhook Support ---

export interface WebhookDefinition {
  /** A unique name for the webhook handler. */
  name: string;
  /** Events this webhook can process. */
  events: string[];
  /** Handler called when webhook event is received. */
  handler: (
    context: PluginContext,
    event: string,
    payload: any,
  ) => Promise<void> | void;
}

// --- Admin UI Extensions ---

export interface AdminPageDefinition {
  /** Route path for the admin page (e.g., '/my-plugin/settings'). */
  path: string;
  /** Display name in the admin navigation. */
  title: string;
  /** Icon name (from the admin icon library). */
  icon?: string;
  /** React component name that renders the page. */
  component: string;
  /** Navigation group (e.g., 'plugins', 'settings'). */
  group?: string;
}

// --- Inter-Plugin Communication ---

export interface PluginEventBus {
  /** Emit an event to other plugins. */
  emit: (event: string, data: any) => Promise<void>;
  /** Subscribe to events from other plugins. */
  on: (event: string, handler: (data: any) => Promise<void> | void) => void;
  /** Unsubscribe from events. */
  off: (event: string, handler: (data: any) => Promise<void> | void) => void;
}

// --- Plugin API (expanded) ---

export interface PluginAPI {
  getConfig: (key: string) => any;
  setConfig: (key: string, value: any) => Promise<void>;
  makeRequest: (url: string, options?: RequestInit) => Promise<Response>;
  log: (message: string, level?: "info" | "warn" | "error") => void;

  /** Scoped database access for the plugin. */
  db: PluginDatabaseAPI;

  /** Register a custom API endpoint. */
  registerEndpoint: (definition: EndpointDefinition) => void;

  /** Register a scheduled job. */
  registerCronJob: (definition: CronJobDefinition) => void;

  /** Inter-plugin event bus for cross-plugin communication. */
  events: PluginEventBus;

  /** Register a webhook handler. */
  registerWebhook: (definition: WebhookDefinition) => void;

  /** Register an admin UI page extension. */
  registerAdminPage: (definition: AdminPageDefinition) => void;
}

export type HookCallback = (
  context: PluginContext,
  ...args: any[]
) => Promise<void> | void;
export type FilterCallback = (
  context: PluginContext,
  value: any,
  ...args: any[]
) => Promise<any> | any;

export interface PluginDefinition {
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions?: string[];
  hooks?: Record<string, HookCallback>;
  filters?: Record<string, FilterCallback>;
  settings?: Record<
    string,
    {
      type: "string" | "number" | "boolean" | "select";
      label: string;
      default?: any;
      options?: string[];
    }
  >;
  /** Custom API endpoints registered by this plugin. */
  endpoints?: EndpointDefinition[];
  /** Scheduled jobs registered by this plugin. */
  cronJobs?: CronJobDefinition[];
  /** Webhook handlers registered by this plugin. */
  webhooks?: WebhookDefinition[];
  /** Admin UI pages registered by this plugin. */
  adminPages?: AdminPageDefinition[];
  onActivate?: (context: PluginContext) => Promise<void> | void;
  onDeactivate?: (context: PluginContext) => Promise<void> | void;
}

export interface AgentbasePlugin {
  manifest: PluginManifest;
  definition: PluginDefinition;
}

// --- Factory ---

export function createPlugin(definition: PluginDefinition): AgentbasePlugin {
  const manifest: PluginManifest = {
    name: definition.name,
    version: definition.version,
    description: definition.description,
    author: definition.author,
    permissions: definition.permissions,
  };

  return { manifest, definition };
}

// --- Hook Helpers ---

const hookRegistry = new Map<string, HookCallback[]>();
const filterRegistry = new Map<string, FilterCallback[]>();

export function registerHook(hookName: string, callback: HookCallback): void {
  const hooks = hookRegistry.get(hookName) || [];
  hooks.push(callback);
  hookRegistry.set(hookName, hooks);
}

export function registerFilter(
  filterName: string,
  callback: FilterCallback,
): void {
  const filters = filterRegistry.get(filterName) || [];
  filters.push(callback);
  filterRegistry.set(filterName, filters);
}

export async function doAction(
  hookName: string,
  context: PluginContext,
  ...args: any[]
): Promise<void> {
  const hooks = hookRegistry.get(hookName) || [];
  for (const hook of hooks) {
    await hook(context, ...args);
  }
}

export async function applyFilter(
  filterName: string,
  context: PluginContext,
  value: any,
  ...args: any[]
): Promise<any> {
  const filters = filterRegistry.get(filterName) || [];
  let result = value;
  for (const filter of filters) {
    result = await filter(context, result, ...args);
  }
  return result;
}

// --- Plugin Event Bus Implementation ---

const eventHandlers = new Map<
  string,
  Set<(data: any) => Promise<void> | void>
>();

export const pluginEventBus: PluginEventBus = {
  async emit(event: string, data: any) {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        await handler(data);
      }
    }
  },
  on(event: string, handler: (data: any) => Promise<void> | void) {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set());
    }
    eventHandlers.get(event)!.add(handler);
  },
  off(event: string, handler: (data: any) => Promise<void> | void) {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  },
};
