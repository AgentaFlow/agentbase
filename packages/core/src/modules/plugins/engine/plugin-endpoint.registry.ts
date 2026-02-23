import { Injectable, Logger } from "@nestjs/common";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface EndpointHandler {
  (req: any, res: any): Promise<void> | void;
}

interface RegisteredEndpoint {
  pluginId: string;
  method: HttpMethod;
  path: string;
  handler: EndpointHandler;
  auth?: boolean;
  description?: string;
}

/**
 * Registry for plugin-registered custom API endpoints.
 * Plugins can register custom HTTP endpoints that are dynamically routed.
 */
@Injectable()
export class PluginEndpointRegistry {
  private readonly logger = new Logger(PluginEndpointRegistry.name);
  private endpoints: RegisteredEndpoint[] = [];

  /**
   * Register a custom API endpoint for a plugin.
   */
  register(endpoint: RegisteredEndpoint): void {
    // Remove existing endpoint with same signature
    this.endpoints = this.endpoints.filter(
      (e) =>
        !(
          e.pluginId === endpoint.pluginId &&
          e.method === endpoint.method &&
          e.path === endpoint.path
        ),
    );
    this.endpoints.push(endpoint);
    this.logger.log(
      `Endpoint registered: ${endpoint.method} ${endpoint.path} (plugin: ${endpoint.pluginId})`,
    );
  }

  /**
   * Find a handler matching a plugin, method, and path.
   */
  findHandler(
    pluginId: string,
    method: string,
    path: string,
  ): EndpointHandler | null {
    const endpoint = this.endpoints.find(
      (e) =>
        e.pluginId === pluginId &&
        e.method === method.toUpperCase() &&
        this.matchPath(e.path, path),
    );
    return endpoint?.handler || null;
  }

  /**
   * Remove all endpoints for a plugin.
   */
  removePlugin(pluginId: string): void {
    const count = this.endpoints.filter((e) => e.pluginId === pluginId).length;
    this.endpoints = this.endpoints.filter((e) => e.pluginId !== pluginId);
    if (count > 0) {
      this.logger.log(`Removed ${count} endpoints for plugin: ${pluginId}`);
    }
  }

  /**
   * Get all registered endpoints (for admin/debugging).
   */
  getAll(): Omit<RegisteredEndpoint, "handler">[] {
    return this.endpoints.map(({ handler, ...rest }) => rest);
  }

  /**
   * Get endpoints for a specific plugin.
   */
  getPluginEndpoints(pluginId: string): Omit<RegisteredEndpoint, "handler">[] {
    return this.endpoints
      .filter((e) => e.pluginId === pluginId)
      .map(({ handler, ...rest }) => rest);
  }

  private matchPath(pattern: string, actual: string): boolean {
    // Simple path matching with :param support
    const patternParts = pattern.split("/").filter(Boolean);
    const actualParts = actual.split("/").filter(Boolean);

    if (patternParts.length !== actualParts.length) return false;

    return patternParts.every((part, i) => {
      if (part.startsWith(":")) return true; // wildcard param
      return part === actualParts[i];
    });
  }
}
