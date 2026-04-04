/**
 * {{PLUGIN_NAME}} — Unit Tests
 *
 * NOTE: This test file imports from `../../test-utils` which is built in
 * Step 0.3 (Plugin Test Harness). Until that step is complete, tests must
 * mock PluginContext and PluginAPI manually (see inline mock below).
 *
 * Once Step 0.3 is done, replace the inline mock with:
 *   import { createMockPluginAPI, createMockHookEngine } from '../../test-utils';
 */
import plugin from "../src/index";
import { PluginContext, PluginAPI } from "@agentbase/plugin-sdk";

// ── Inline mock (remove once Step 0.3 test-utils are available) ───────────────

function createMockPluginAPI(): PluginAPI {
  const db = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(true),
    keys: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };

  const events = {
    emit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
  };

  return {
    getConfig: jest.fn().mockReturnValue(undefined),
    setConfig: jest.fn().mockResolvedValue(undefined),
    makeRequest: jest.fn().mockResolvedValue(new Response("{}")),
    log: jest.fn(),
    db,
    events,
    registerEndpoint: jest.fn(),
    registerCronJob: jest.fn(),
    registerWebhook: jest.fn(),
    registerAdminPage: jest.fn(),
  };
}

function createMockContext(
  overrides: Partial<PluginContext> = {},
): PluginContext {
  return {
    appId: "test-app-id",
    userId: "test-user-id",
    config: {},
    api: createMockPluginAPI(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("{{PLUGIN_NAME}}", () => {
  describe("manifest", () => {
    it("exports a valid plugin with name and version", () => {
      expect(plugin.manifest.name).toBe("{{PLUGIN_SLUG}}");
      expect(plugin.manifest.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("has a description", () => {
      expect(plugin.manifest.description).toBeTruthy();
    });
  });

  describe("hooks", () => {
    it("app:init logs initialization message", async () => {
      const context = createMockContext();
      const initHook = plugin.definition.hooks?.["app:init"];

      expect(initHook).toBeDefined();
      await initHook!(context);

      expect(context.api.log).toHaveBeenCalledWith(
        expect.stringContaining("initialized"),
      );
    });
  });

  describe("lifecycle", () => {
    it("onActivate logs activation message", async () => {
      const context = createMockContext();
      await plugin.definition.onActivate!(context);
      expect(context.api.log).toHaveBeenCalledWith(
        expect.stringContaining("activated"),
      );
    });

    it("onDeactivate logs deactivation message", async () => {
      const context = createMockContext();
      await plugin.definition.onDeactivate!(context);
      expect(context.api.log).toHaveBeenCalledWith(
        expect.stringContaining("deactivated"),
      );
    });
  });

  // TODO: Add tests for custom endpoints, filters, and cron jobs as you
  // implement them. Each endpoint handler should be extracted into a testable
  // service function rather than inlined in the endpoint definition.
});
