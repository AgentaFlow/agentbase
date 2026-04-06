/// <reference types="jest" />
/**
 * Zapier Bridge — Unit Tests
 *
 * Covers: DB key helpers, ID generators, purgeOldEvents, fanOutEvent,
 * plugin manifest/settings, app:init (5 endpoints),
 * POST /subscribe, DELETE /subscribe/:hookId, GET /subscribe,
 * POST /action (all 3 action types + auth + guards),
 * GET /events (filter, limit), conversation:end hook, user:register hook.
 */
import plugin, {
  buildHookKey,
  buildEventKey,
  generateHookId,
  generateEventId,
  purgeOldEvents,
  fanOutEvent,
  SUPPORTED_EVENTS,
  SUPPORTED_ACTIONS,
  MAX_STORED_EVENTS,
  HookRecord,
  EventRecord,
  ZapierActionPayload,
} from "../src/index";
import {
  PluginContext,
  PluginAPI,
  PluginDatabaseAPI,
  PluginEventBus,
  EndpointDefinition,
  EndpointRequest,
  EndpointResponse,
} from "@agentbase/plugin-sdk";

// ── Mock factory ──────────────────────────────────────────────────────────────

function createMockAPI(): PluginAPI & { _endpoints: EndpointDefinition[] } {
  const store = new Map<string, unknown>();
  const _endpoints: EndpointDefinition[] = [];

  const db: PluginDatabaseAPI = {
    set: jest
      .fn()
      .mockImplementation(async (k: string, v: unknown) => store.set(k, v)),
    get: jest
      .fn()
      .mockImplementation(async (k: string) => store.get(k) ?? null),
    delete: jest.fn().mockImplementation(async (k: string) => {
      const had = store.has(k);
      store.delete(k);
      return had;
    }),
    keys: jest
      .fn()
      .mockImplementation(async (prefix?: string) =>
        [...store.keys()].filter((k) => !prefix || k.startsWith(prefix)),
      ),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };

  const events: PluginEventBus = {
    emit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
  };

  const configStore = new Map<string, unknown>([
    ["enableTriggers", true],
    ["enableActions", true],
    ["allowedActions", "send_message,emit_event,update_context"],
    ["actionSecret", ""],
  ]);

  return {
    _endpoints,
    getConfig: jest
      .fn()
      .mockImplementation((k: string) => configStore.get(k) ?? undefined),
    setConfig: jest
      .fn()
      .mockImplementation(async (k: string, v: unknown) =>
        configStore.set(k, v),
      ),
    makeRequest: jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(""),
    }),
    log: jest.fn(),
    db,
    events,
    registerEndpoint: jest
      .fn()
      .mockImplementation((def: EndpointDefinition) => _endpoints.push(def)),
    registerCronJob: jest.fn(),
    registerWebhook: jest.fn(),
    registerAdminPage: jest.fn(),
  } as unknown as PluginAPI & { _endpoints: EndpointDefinition[] };
}

type MockAPI = ReturnType<typeof createMockAPI>;
type MockCtx = PluginContext & { api: MockAPI };

function makeCtx(overrides: Partial<PluginContext> = {}): MockCtx {
  const api = createMockAPI();
  return {
    appId: "app-1",
    userId: "user-1",
    config: {},
    api,
    ...overrides,
  } as MockCtx;
}

interface MockRes {
  status: jest.Mock;
  json: jest.Mock;
  _status: number;
  _body: unknown;
}

function makeRes(): MockRes {
  const r: MockRes = {
    _status: 200,
    _body: undefined,
    status: jest.fn(),
    json: jest.fn(),
  };
  r.status.mockImplementation((code: number) => {
    r._status = code;
    return r;
  });
  r.json.mockImplementation((body: unknown) => {
    r._body = body;
  });
  return r;
}

function makeReq(overrides: Partial<EndpointRequest> = {}): EndpointRequest {
  return {
    method: "GET",
    path: "/",
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  };
}

async function runInit(ctx: MockCtx): Promise<void> {
  const hook = plugin.definition.hooks?.["app:init"];
  if (!hook) throw new Error("app:init hook not registered");
  await hook(ctx);
}

function getEndpoint(
  api: MockAPI,
  method: string,
  path: string,
): EndpointDefinition {
  const ep = api._endpoints.find((e) => e.method === method && e.path === path);
  if (!ep) throw new Error(`Endpoint ${method} ${path} not found`);
  return ep;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

describe("DB key helpers", () => {
  it("buildHookKey", () => {
    expect(buildHookKey("h_abc")).toBe("hook:h_abc");
  });

  it("buildEventKey", () => {
    expect(buildEventKey("e_xyz")).toBe("event:e_xyz");
  });
});

// ── ID generators ─────────────────────────────────────────────────────────────

describe("ID generators", () => {
  it("generateHookId starts with hook_", () => {
    expect(generateHookId()).toMatch(/^hook_[a-f0-9]+$/);
  });

  it("generateHookId returns unique values", () => {
    const ids = new Set(Array.from({ length: 20 }, generateHookId));
    expect(ids.size).toBe(20);
  });

  it("generateEventId starts with evt_", () => {
    expect(generateEventId()).toMatch(/^evt_[a-f0-9]+$/);
  });

  it("generateEventId returns unique values", () => {
    const ids = new Set(Array.from({ length: 20 }, generateEventId));
    expect(ids.size).toBe(20);
  });
});

// ── purgeOldEvents ────────────────────────────────────────────────────────────

describe("purgeOldEvents", () => {
  it("does nothing when event count is at or below MAX_STORED_EVENTS", async () => {
    const store = new Map<string, unknown>();
    for (let i = 0; i < 50; i++) {
      store.set(`event:e${i}`, { eventId: `e${i}`, timestamp: i });
    }
    const dbDelete = jest.fn();
    await purgeOldEvents(
      async (k) => store.get(k) ?? null,
      dbDelete,
      async (prefix) =>
        [...store.keys()].filter((k) => !prefix || k.startsWith(prefix)),
    );
    expect(dbDelete).not.toHaveBeenCalled();
  });

  it("prunes oldest events when over MAX_STORED_EVENTS", async () => {
    const store = new Map<string, unknown>();
    const total = MAX_STORED_EVENTS + 5;
    for (let i = 0; i < total; i++) {
      store.set(`event:e${i}`, { eventId: `e${i}`, timestamp: i });
    }
    const deleted: string[] = [];
    await purgeOldEvents(
      async (k) => store.get(k) ?? null,
      async (k) => {
        deleted.push(k);
        return true;
      },
      async (prefix) =>
        [...store.keys()].filter((k) => !prefix || k.startsWith(prefix)),
    );
    // Should delete the 5 oldest (lowest timestamps: e0..e4)
    expect(deleted).toHaveLength(5);
    const deletedIds = deleted.map((k) => k.replace("event:", ""));
    expect(deletedIds).toEqual(
      expect.arrayContaining(["e0", "e1", "e2", "e3", "e4"]),
    );
  });
});

// ── fanOutEvent ───────────────────────────────────────────────────────────────

describe("fanOutEvent", () => {
  it("stores an EventRecord", async () => {
    const ctx = makeCtx();
    await fanOutEvent(ctx, "conversation.end", { some: "data" });
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      expect.stringMatching(/^event:/),
      expect.objectContaining({ type: "conversation.end" }),
    );
  });

  it("POSTs to all subscribers of the matching event", async () => {
    const ctx = makeCtx();
    const hook1: HookRecord = {
      hookId: "h1",
      targetUrl: "https://a.com",
      event: "conversation.end",
      createdAt: 1,
    };
    const hook2: HookRecord = {
      hookId: "h2",
      targetUrl: "https://b.com",
      event: "user.register",
      createdAt: 2,
    };
    await ctx.api.db.set("hook:h1", hook1);
    await ctx.api.db.set("hook:h2", hook2);

    await fanOutEvent(ctx, "conversation.end", {});
    await new Promise((r) => setTimeout(r, 20));

    const makeReqCalls = (ctx.api.makeRequest as jest.Mock).mock.calls as [
      string,
      RequestInit,
    ][];
    const postedUrls = makeReqCalls.map(([url]) => url);
    expect(postedUrls).toContain("https://a.com");
    expect(postedUrls).not.toContain("https://b.com");
  });

  it("posts to 'custom' event subscribers for any event type", async () => {
    const ctx = makeCtx();
    const hook: HookRecord = {
      hookId: "hc",
      targetUrl: "https://c.com",
      event: "custom",
      createdAt: 1,
    };
    await ctx.api.db.set("hook:hc", hook);
    await fanOutEvent(ctx, "conversation.end", {});
    await new Promise((r) => setTimeout(r, 20));
    const calls = (ctx.api.makeRequest as jest.Mock).mock.calls as [string][];
    expect(calls.some(([url]) => url === "https://c.com")).toBe(true);
  });

  it("logs on delivery failure but does not throw", async () => {
    const ctx = makeCtx();
    const hook: HookRecord = {
      hookId: "hfail",
      targetUrl: "https://fail.com",
      event: "user.register",
      createdAt: 1,
    };
    await ctx.api.db.set("hook:hfail", hook);
    (ctx.api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    await fanOutEvent(ctx, "user.register", {});
    await new Promise((r) => setTimeout(r, 20));
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("failed"),
      "warn",
    );
  });

  it("logs on delivery exception but does not throw", async () => {
    const ctx = makeCtx();
    const hook: HookRecord = {
      hookId: "herr",
      targetUrl: "https://err.com",
      event: "user.register",
      createdAt: 1,
    };
    await ctx.api.db.set("hook:herr", hook);
    (ctx.api.makeRequest as jest.Mock).mockRejectedValueOnce(
      new Error("ECONNREFUSED"),
    );
    await fanOutEvent(ctx, "user.register", {});
    await new Promise((r) => setTimeout(r, 20));
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("ECONNREFUSED"),
      "error",
    );
  });
});

// ── Plugin manifest / settings ────────────────────────────────────────────────

describe("plugin manifest / settings", () => {
  it("name is zapier-bridge", () => {
    expect(plugin.definition.name).toBe("zapier-bridge");
  });

  it("version is 1.0.0", () => {
    expect(plugin.definition.version).toBe("1.0.0");
  });

  it("has required settings", () => {
    const settings = plugin.definition.settings!;
    expect(settings).toHaveProperty("enableTriggers");
    expect(settings).toHaveProperty("enableActions");
    expect(settings).toHaveProperty("allowedActions");
    expect(settings).toHaveProperty("actionSecret");
  });

  it("actionSecret is encrypted", () => {
    expect(plugin.definition.settings!["actionSecret"]?.["encrypted"]).toBe(
      true,
    );
  });

  it("enableTriggers default is true", () => {
    expect(plugin.definition.settings!["enableTriggers"]?.default).toBe(true);
  });
});

// ── app:init ──────────────────────────────────────────────────────────────────

describe("app:init", () => {
  it("registers exactly 5 endpoints", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(ctx.api._endpoints).toHaveLength(5);
  });

  it("registers all expected endpoint paths", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const paths = ctx.api._endpoints.map((e) => `${e.method} ${e.path}`);
    expect(paths).toContain("POST /subscribe");
    expect(paths).toContain("DELETE /subscribe/:hookId");
    expect(paths).toContain("GET /subscribe");
    expect(paths).toContain("POST /action");
    expect(paths).toContain("GET /events");
  });
});

// ── POST /subscribe ───────────────────────────────────────────────────────────

describe("POST /subscribe", () => {
  it("returns 403 when enableTriggers is false", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "enableTriggers" ? false : undefined,
    );
    const ep = getEndpoint(ctx.api, "POST", "/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: { targetUrl: "https://z.com", event: "conversation.end" },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(403);
  });

  it("returns 400 when targetUrl is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { event: "conversation.end" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain("targetUrl");
  });

  it("returns 400 when event is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { targetUrl: "https://z.com" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain("event");
  });

  it("returns 400 for unsupported event type", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { targetUrl: "https://z.com", event: "unknown.event" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain(
      "Unsupported event",
    );
  });

  it("saves hook and returns 201 with id on success", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: {
          targetUrl: "https://hooks.zapier.com/123",
          event: "conversation.end",
        },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
    const body = res._body as { id: string; event: string; targetUrl: string };
    expect(body.event).toBe("conversation.end");
    expect(body.id).toMatch(/^hook_/);
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      expect.stringMatching(/^hook:/),
      expect.objectContaining({ targetUrl: "https://hooks.zapier.com/123" }),
    );
  });

  it("accepts 'custom' as a valid event type", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { targetUrl: "https://z.com/hook", event: "custom" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
  });

  it("accepts all SUPPORTED_EVENTS", async () => {
    for (const event of SUPPORTED_EVENTS) {
      const ctx = makeCtx();
      await runInit(ctx);
      const ep = getEndpoint(ctx.api, "POST", "/subscribe");
      const res = makeRes();
      await ep.handler!(
        makeReq({ body: { targetUrl: "https://z.com", event } }),
        res as unknown as EndpointResponse,
      );
      expect(res._status).toBe(201);
    }
  });
});

// ── DELETE /subscribe/:hookId ─────────────────────────────────────────────────

describe("DELETE /subscribe/:hookId", () => {
  it("returns 400 when hookId param is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "DELETE", "/subscribe/:hookId");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: {} }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 404 when hook does not exist", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "DELETE", "/subscribe/:hookId");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { hookId: "nonexistent" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(404);
  });

  it("deletes hook and returns deleted:true", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const hook: HookRecord = {
      hookId: "hook_del1",
      targetUrl: "https://a.com",
      event: "user.register",
      createdAt: 1,
    };
    await ctx.api.db.set(buildHookKey("hook_del1"), hook);

    const ep = getEndpoint(ctx.api, "DELETE", "/subscribe/:hookId");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { hookId: "hook_del1" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    expect((res._body as { deleted: boolean }).deleted).toBe(true);
    expect(ctx.api.db.delete).toHaveBeenCalledWith(buildHookKey("hook_del1"));
  });
});

// ── GET /subscribe ────────────────────────────────────────────────────────────

describe("GET /subscribe", () => {
  it("returns empty hooks list when none registered", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/subscribe");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect((res._body as { hooks: unknown[] }).hooks).toEqual([]);
  });

  it("returns all registered hooks", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const h1: HookRecord = {
      hookId: "h1",
      targetUrl: "https://a.com",
      event: "conversation.end",
      createdAt: 1,
    };
    const h2: HookRecord = {
      hookId: "h2",
      targetUrl: "https://b.com",
      event: "user.register",
      createdAt: 2,
    };
    await ctx.api.db.set(buildHookKey("h1"), h1);
    await ctx.api.db.set(buildHookKey("h2"), h2);

    const ep = getEndpoint(ctx.api, "GET", "/subscribe");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect((res._body as { hooks: HookRecord[] }).hooks).toHaveLength(2);
  });
});

// ── POST /action ──────────────────────────────────────────────────────────────

describe("POST /action", () => {
  it("returns 403 when enableActions is false", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "enableActions" ? false : undefined,
    );
    const ep = getEndpoint(ctx.api, "POST", "/action");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { action: "send_message", data: {} } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(403);
  });

  it("returns 401 when actionSecret is set and header is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      if (k === "actionSecret") return "super_secret";
      if (k === "enableActions") return true;
      if (k === "allowedActions") return "send_message";
      return undefined;
    });
    const ep = getEndpoint(ctx.api, "POST", "/action");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: { action: "send_message", data: { message: "hi" } },
        headers: {},
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(401);
  });

  it("returns 401 when actionSecret is set and header is wrong", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      if (k === "actionSecret") return "super_secret";
      if (k === "enableActions") return true;
      if (k === "allowedActions") return "send_message";
      return undefined;
    });
    const ep = getEndpoint(ctx.api, "POST", "/action");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: { action: "send_message", data: { message: "hi" } },
        headers: { "x-zapier-secret": "wrong" },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(401);
  });

  it("passes through when correct secret provided", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      if (k === "actionSecret") return "super_secret";
      if (k === "enableActions") return true;
      if (k === "allowedActions") return "send_message";
      return undefined;
    });
    const ep = getEndpoint(ctx.api, "POST", "/action");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: { action: "send_message", data: { message: "hello" } },
        headers: { "x-zapier-secret": "super_secret" },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
  });

  it("returns 400 when action field is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/action");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { data: {} } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain("action");
  });

  it("returns 400 when data field is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/action");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { action: "send_message" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 403 when action is not in allowedActions", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      if (k === "enableActions") return true;
      if (k === "allowedActions") return "send_message";
      if (k === "actionSecret") return "";
      return undefined;
    });
    const ep = getEndpoint(ctx.api, "POST", "/action");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { action: "emit_event", data: { eventName: "x" } } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(403);
    expect((res._body as { error: string }).error).toContain("allowed actions");
  });

  describe("send_message action", () => {
    it("returns 400 when message is missing", async () => {
      const ctx = makeCtx();
      await runInit(ctx);
      const ep = getEndpoint(ctx.api, "POST", "/action");
      const res = makeRes();
      await ep.handler!(
        makeReq({ body: { action: "send_message", data: { userId: "U1" } } }),
        res as unknown as EndpointResponse,
      );
      expect(res._status).toBe(400);
      expect((res._body as { error: string }).error).toContain("message");
    });

    it("emits zapier:send_message and returns ok", async () => {
      const ctx = makeCtx();
      await runInit(ctx);
      const ep = getEndpoint(ctx.api, "POST", "/action");
      const res = makeRes();
      await ep.handler!(
        makeReq({
          body: {
            action: "send_message",
            data: { message: "Hello AI", userId: "U1" },
          },
        }),
        res as unknown as EndpointResponse,
      );
      expect(res._status).toBe(200);
      expect(ctx.api.events.emit).toHaveBeenCalledWith(
        "zapier:send_message",
        expect.objectContaining({ message: "Hello AI", userId: "U1" }),
      );
    });
  });

  describe("emit_event action", () => {
    it("returns 400 when eventName is missing", async () => {
      const ctx = makeCtx();
      await runInit(ctx);
      const ep = getEndpoint(ctx.api, "POST", "/action");
      const res = makeRes();
      await ep.handler!(
        makeReq({ body: { action: "emit_event", data: { eventData: {} } } }),
        res as unknown as EndpointResponse,
      );
      expect(res._status).toBe(400);
      expect((res._body as { error: string }).error).toContain("eventName");
    });

    it("emits zapier:<eventName> and returns ok with eventName", async () => {
      const ctx = makeCtx();
      await runInit(ctx);
      const ep = getEndpoint(ctx.api, "POST", "/action");
      const res = makeRes();
      await ep.handler!(
        makeReq({
          body: {
            action: "emit_event",
            data: { eventName: "myEvent", eventData: { x: 1 } },
          },
        }),
        res as unknown as EndpointResponse,
      );
      expect(res._status).toBe(200);
      expect((res._body as { eventName: string }).eventName).toBe("myEvent");
      expect(ctx.api.events.emit).toHaveBeenCalledWith(
        "zapier:myEvent",
        expect.anything(),
      );
    });
  });

  describe("update_context action", () => {
    it("returns 400 when key is missing", async () => {
      const ctx = makeCtx();
      await runInit(ctx);
      const ep = getEndpoint(ctx.api, "POST", "/action");
      const res = makeRes();
      await ep.handler!(
        makeReq({ body: { action: "update_context", data: { value: "v" } } }),
        res as unknown as EndpointResponse,
      );
      expect(res._status).toBe(400);
    });

    it("emits zapier:update_context and returns ok with key", async () => {
      const ctx = makeCtx();
      await runInit(ctx);
      const ep = getEndpoint(ctx.api, "POST", "/action");
      const res = makeRes();
      await ep.handler!(
        makeReq({
          body: {
            action: "update_context",
            data: { key: "theme", value: "dark" },
          },
        }),
        res as unknown as EndpointResponse,
      );
      expect(res._status).toBe(200);
      expect((res._body as { key: string }).key).toBe("theme");
      expect(ctx.api.events.emit).toHaveBeenCalledWith(
        "zapier:update_context",
        expect.objectContaining({ key: "theme", value: "dark" }),
      );
    });
  });
});

// ── GET /events ───────────────────────────────────────────────────────────────

describe("GET /events", () => {
  it("returns empty events array when none stored", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/events");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect((res._body as { events: unknown[] }).events).toEqual([]);
  });

  it("returns stored events sorted newest first", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const e1: EventRecord = {
      eventId: "e1",
      type: "conversation.end",
      payload: {},
      timestamp: 1000,
    };
    const e2: EventRecord = {
      eventId: "e2",
      type: "user.register",
      payload: {},
      timestamp: 2000,
    };
    await ctx.api.db.set(buildEventKey("e1"), e1);
    await ctx.api.db.set(buildEventKey("e2"), e2);

    const ep = getEndpoint(ctx.api, "GET", "/events");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    const events = (res._body as { events: EventRecord[] }).events;
    expect(events[0]!.eventId).toBe("e2"); // newest first
    expect(events[1]!.eventId).toBe("e1");
  });

  it("filters by type when query.type is provided", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const e1: EventRecord = {
      eventId: "e1",
      type: "conversation.end",
      payload: {},
      timestamp: 1000,
    };
    const e2: EventRecord = {
      eventId: "e2",
      type: "user.register",
      payload: {},
      timestamp: 2000,
    };
    await ctx.api.db.set(buildEventKey("e1"), e1);
    await ctx.api.db.set(buildEventKey("e2"), e2);

    const ep = getEndpoint(ctx.api, "GET", "/events");
    const res = makeRes();
    await ep.handler!(
      makeReq({ query: { type: "user.register" } }),
      res as unknown as EndpointResponse,
    );
    const events = (res._body as { events: EventRecord[] }).events;
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("user.register");
  });

  it("respects limit query parameter", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    for (let i = 0; i < 10; i++) {
      await ctx.api.db.set(buildEventKey(`e${i}`), {
        eventId: `e${i}`,
        type: "conversation.end",
        payload: {},
        timestamp: i,
      });
    }
    const ep = getEndpoint(ctx.api, "GET", "/events");
    const res = makeRes();
    await ep.handler!(
      makeReq({ query: { limit: "3" } }),
      res as unknown as EndpointResponse,
    );
    expect((res._body as { events: unknown[] }).events).toHaveLength(3);
  });

  it("caps limit at MAX_STORED_EVENTS", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    for (let i = 0; i < 10; i++) {
      await ctx.api.db.set(buildEventKey(`e${i}`), {
        eventId: `e${i}`,
        type: "user.register",
        payload: {},
        timestamp: i,
      });
    }
    const ep = getEndpoint(ctx.api, "GET", "/events");
    const res = makeRes();
    await ep.handler!(
      makeReq({ query: { limit: String(MAX_STORED_EVENTS + 50) } }),
      res as unknown as EndpointResponse,
    );
    const events = (res._body as { events: unknown[] }).events;
    expect(events.length).toBeLessThanOrEqual(MAX_STORED_EVENTS);
  });
});

// ── conversation:end hook ─────────────────────────────────────────────────────

describe("conversation:end hook", () => {
  it("does nothing when enableTriggers is false", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "enableTriggers" ? false : undefined,
    );
    const hook = plugin.definition.hooks?.["conversation:end"];
    if (!hook) throw new Error("conversation:end hook not registered");
    await hook(ctx);
    expect(ctx.api.db.set).not.toHaveBeenCalled();
  });

  it("calls fanOutEvent with conversation.end", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockReturnValue(true);
    const hook = plugin.definition.hooks?.["conversation:end"];
    if (!hook) throw new Error("conversation:end hook not registered");
    await hook(ctx);
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      expect.stringMatching(/^event:/),
      expect.objectContaining({ type: "conversation.end" }),
    );
  });
});

// ── user:register hook ────────────────────────────────────────────────────────

describe("user:register hook", () => {
  it("does nothing when enableTriggers is false", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "enableTriggers" ? false : undefined,
    );
    const hook = plugin.definition.hooks?.["user:register"];
    if (!hook) throw new Error("user:register hook not registered");
    await hook(ctx);
    expect(ctx.api.db.set).not.toHaveBeenCalled();
  });

  it("calls fanOutEvent with user.register", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockReturnValue(true);
    const hook = plugin.definition.hooks?.["user:register"];
    if (!hook) throw new Error("user:register hook not registered");
    await hook(ctx);
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      expect.stringMatching(/^event:/),
      expect.objectContaining({ type: "user.register" }),
    );
  });
});
