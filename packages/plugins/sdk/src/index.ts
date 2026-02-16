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

export interface PluginAPI {
  getConfig: (key: string) => any;
  setConfig: (key: string, value: any) => Promise<void>;
  makeRequest: (url: string, options?: RequestInit) => Promise<Response>;
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

export type HookCallback = (context: PluginContext, ...args: any[]) => Promise<void> | void;
export type FilterCallback = (context: PluginContext, value: any, ...args: any[]) => Promise<any> | any;

export interface PluginDefinition {
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions?: string[];
  hooks?: Record<string, HookCallback>;
  filters?: Record<string, FilterCallback>;
  settings?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    default?: any;
    options?: string[];
  }>;
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

export function registerFilter(filterName: string, callback: FilterCallback): void {
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
