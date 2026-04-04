/// <reference types="jest" />
/**
 * AI Chat Widget — Unit Tests
 */
import plugin, {
  generateSessionId,
  buildSessionKey,
  buildActiveKey,
  trimMessages,
  ChatSession,
  ChatMessage,
  DEFAULT_MODEL,
  DEFAULT_MAX_HISTORY,
  SUPPORTED_MODELS,
} from "../src/index";
import {
  PluginContext,
  PluginAPI,
  PluginDatabaseAPI,
  PluginEventBus,
  EndpointDefinition,
  EndpointRequest,
} from "@agentbase/plugin-sdk";

// ── Mock factory ─────────────────────────────────────────────────────────────

function createMockAPI(): PluginAPI & { _endpoints: EndpointDefinition[] } {
  const store = new Map<string, any>();
  const _endpoints: EndpointDefinition[] = [];

  const db: PluginDatabaseAPI = {
    set: jest
      .fn()
      .mockImplementation(async (k: string, v: any) => store.set(k, v)),
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

  const api = {
    _endpoints,
    getConfig: jest.fn().mockReturnValue(undefined),
    setConfig: jest.fn().mockResolvedValue(undefined),
    makeRequest: jest.fn().mockResolvedValue({ ok: true, status: 200 }),
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

  return api;
}

function makeCtx(
  overrides: Partial<PluginContext> = {},
): PluginContext & { api: ReturnType<typeof createMockAPI> } {
  return {
    appId: "app1",
    userId: "user1",
    config: {},
    api: createMockAPI(),
    ...overrides,
  } as any;
}

/** Run app:init and return the registered endpoints array. */
async function initEndpoints(ctx: ReturnType<typeof makeCtx>) {
  await plugin.definition.hooks!["app:init"]!(ctx);
  return ctx.api._endpoints;
}

function makeRes() {
  const res = {
    _status: 200,
    _data: undefined as any,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: any) {
      this._data = data;
    },
    send(data: string) {
      this._data = data;
    },
  };
  return res;
}

function fakeReq(override: Partial<EndpointRequest> = {}): EndpointRequest {
  return {
    method: "GET",
    path: "/",
    params: {},
    query: {},
    body: {},
    headers: {},
    ...override,
  };
}

// ── Helper function unit tests ────────────────────────────────────────────────

describe("generateSessionId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateSessionId()).toBe("string");
    expect(generateSessionId().length).toBeGreaterThan(0);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 50 }, generateSessionId));
    expect(ids.size).toBe(50);
  });
});

describe("buildSessionKey", () => {
  it("prefixes with session:", () => {
    expect(buildSessionKey("abc")).toBe("session:abc");
  });
});

describe("buildActiveKey", () => {
  it("builds composite key", () => {
    expect(buildActiveKey("app1", "user1")).toBe("active:app1:user1");
  });
});

describe("trimMessages", () => {
  const msg = (n: number): ChatMessage => ({
    role: "user",
    content: `m${n}`,
    ts: n,
  });

  it("returns array unchanged when under limit", () => {
    const msgs = [msg(1), msg(2)];
    expect(trimMessages(msgs, 5)).toEqual(msgs);
  });

  it("trims from the oldest end when over limit", () => {
    const msgs = [msg(1), msg(2), msg(3), msg(4), msg(5)];
    const result = trimMessages(msgs, 3);
    expect(result).toHaveLength(3);
    expect(result[0].content).toBe("m3");
    expect(result[2].content).toBe("m5");
  });

  it("returns unchanged when exactly at limit", () => {
    const msgs = [msg(1), msg(2), msg(3)];
    expect(trimMessages(msgs, 3)).toHaveLength(3);
  });

  it("returns unchanged when maxHistory is 0 (disabled)", () => {
    const msgs = [msg(1), msg(2)];
    expect(trimMessages(msgs, 0)).toEqual(msgs);
  });
});

// ── Plugin structure ──────────────────────────────────────────────────────────

describe("plugin definition", () => {
  it("has correct name and version", () => {
    expect(plugin.definition.name).toBe("ai-chat-widget");
    expect(plugin.definition.version).toBe("1.0.0");
  });

  it("defines all four settings with correct types", () => {
    const s = plugin.definition.settings!;
    expect(s.systemPrompt.type).toBe("string");
    expect(s.model.type).toBe("select");
    expect(s.model.options).toEqual([...SUPPORTED_MODELS]);
    expect(s.model.default).toBe(DEFAULT_MODEL);
    expect(s.streamingEnabled.type).toBe("boolean");
    expect(s.streamingEnabled.default).toBe(true);
    expect(s.maxHistory.type).toBe("number");
    expect(s.maxHistory.default).toBe(DEFAULT_MAX_HISTORY);
  });

  it("defines hooks for all four lifecycle events", () => {
    const h = Object.keys(plugin.definition.hooks!);
    expect(h).toContain("app:init");
    expect(h).toContain("conversation:start");
    expect(h).toContain("conversation:beforeMessage");
    expect(h).toContain("conversation:end");
  });

  it("defines filters for prompt:modify and response:modify", () => {
    const f = Object.keys(plugin.definition.filters!);
    expect(f).toContain("prompt:modify");
    expect(f).toContain("response:modify");
  });
});

// ── app:init hook ─────────────────────────────────────────────────────────────

describe("app:init hook", () => {
  it("registers exactly 4 endpoints", async () => {
    const ctx = makeCtx();
    const eps = await initEndpoints(ctx);
    expect(eps).toHaveLength(4);
  });

  it("registers the expected method+path combinations", async () => {
    const ctx = makeCtx();
    const eps = await initEndpoints(ctx);
    const signatures = eps.map((e) => `${e.method} ${e.path}`);
    expect(signatures).toContain("GET /config");
    expect(signatures).toContain("POST /session");
    expect(signatures).toContain("GET /session/:id");
    expect(signatures).toContain("DELETE /session/:id");
  });

  it("marks all endpoints as auth: true", async () => {
    const ctx = makeCtx();
    const eps = await initEndpoints(ctx);
    expect(eps.every((e) => e.auth === true)).toBe(true);
  });
});

// ── conversation:start hook ───────────────────────────────────────────────────

describe("conversation:start hook", () => {
  it("writes a session record and an active key", async () => {
    const ctx = makeCtx();
    await plugin.definition.hooks!["conversation:start"]!(ctx, {});

    const setCalls = (ctx.api.db.set as jest.Mock).mock.calls;
    expect(setCalls).toHaveLength(2);

    const sessionCall = setCalls.find(([k]) => k.startsWith("session:"));
    const activeCall = setCalls.find(([k]) => k.startsWith("active:"));
    expect(sessionCall).toBeDefined();
    expect(activeCall).toBeDefined();
  });

  it("session record contains correct appId, userId and empty messages", async () => {
    const ctx = makeCtx({ appId: "myapp", userId: "myuser" });
    await plugin.definition.hooks!["conversation:start"]!(ctx, {});

    const setCalls = (ctx.api.db.set as jest.Mock).mock.calls;
    const session: ChatSession = setCalls.find(([k]) =>
      k.startsWith("session:"),
    )[1];

    expect(session.appId).toBe("myapp");
    expect(session.userId).toBe("myuser");
    expect(session.messages).toEqual([]);
  });

  it("active key encodes appId and userId", async () => {
    const ctx = makeCtx({ appId: "myapp", userId: "myuser" });
    await plugin.definition.hooks!["conversation:start"]!(ctx, {});

    const setCalls = (ctx.api.db.set as jest.Mock).mock.calls;
    const [activeKey] = setCalls.find(([k]) => k.startsWith("active:"));
    expect(activeKey).toBe("active:myapp:myuser");
  });
});

// ── conversation:beforeMessage hook ──────────────────────────────────────────

describe("conversation:beforeMessage hook", () => {
  it("does nothing when no active session exists", async () => {
    const ctx = makeCtx();
    // db.get returns null for everything (default mock)
    await plugin.definition.hooks!["conversation:beforeMessage"]!(ctx, {
      content: "hello",
      role: "user",
    });
    expect(ctx.api.db.set).not.toHaveBeenCalled();
  });

  it("appends the incoming message to the session", async () => {
    const ctx = makeCtx();
    const sessionId = "s1";
    const session: ChatSession = {
      id: sessionId,
      appId: "app1",
      userId: "user1",
      messages: [],
      model: DEFAULT_MODEL,
      createdAt: 0,
      updatedAt: 0,
    };
    await ctx.api.db.set(buildActiveKey("app1", "user1"), sessionId);
    await ctx.api.db.set(buildSessionKey(sessionId), session);
    (ctx.api.db.set as jest.Mock).mockClear();

    await plugin.definition.hooks!["conversation:beforeMessage"]!(ctx, {
      content: "Hello",
      role: "user",
    });

    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildSessionKey(sessionId),
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ content: "Hello", role: "user" }),
        ]),
      }),
    );
  });

  it("trims messages to maxHistory", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "maxHistory" ? 2 : undefined,
    );

    const sessionId = "s2";
    const existing: ChatMessage[] = [
      { role: "user", content: "a", ts: 1 },
      { role: "assistant", content: "b", ts: 2 },
    ];
    const session: ChatSession = {
      id: sessionId,
      appId: "app1",
      userId: "user1",
      messages: existing,
      model: DEFAULT_MODEL,
      createdAt: 0,
      updatedAt: 0,
    };
    await ctx.api.db.set(buildActiveKey("app1", "user1"), sessionId);
    await ctx.api.db.set(buildSessionKey(sessionId), session);
    (ctx.api.db.set as jest.Mock).mockClear();

    await plugin.definition.hooks!["conversation:beforeMessage"]!(ctx, {
      content: "c",
      role: "user",
    });

    const saved = (ctx.api.db.set as jest.Mock).mock.calls[0][1] as ChatSession;
    expect(saved.messages).toHaveLength(2);
    expect(saved.messages[0].content).toBe("b");
    expect(saved.messages[1].content).toBe("c");
  });
});

// ── conversation:end hook ─────────────────────────────────────────────────────

describe("conversation:end hook", () => {
  it("does nothing when no active session", async () => {
    const ctx = makeCtx();
    await plugin.definition.hooks!["conversation:end"]!(ctx);
    expect(ctx.api.db.set).not.toHaveBeenCalled();
  });

  it("updates updatedAt and removes the active key", async () => {
    const ctx = makeCtx();
    const sessionId = "send1";
    const session: ChatSession = {
      id: sessionId,
      appId: "app1",
      userId: "user1",
      messages: [],
      model: DEFAULT_MODEL,
      createdAt: 1000,
      updatedAt: 1000,
    };
    await ctx.api.db.set(buildActiveKey("app1", "user1"), sessionId);
    await ctx.api.db.set(buildSessionKey(sessionId), session);
    (ctx.api.db.set as jest.Mock).mockClear();

    await plugin.definition.hooks!["conversation:end"]!(ctx);

    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildSessionKey(sessionId),
      expect.objectContaining({ updatedAt: expect.any(Number) }),
    );
    expect(ctx.api.db.delete).toHaveBeenCalledWith(
      buildActiveKey("app1", "user1"),
    );
  });
});

// ── prompt:modify filter ──────────────────────────────────────────────────────

describe("prompt:modify filter", () => {
  it("prepends system prompt to string prompts", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "systemPrompt" ? "Be concise." : undefined,
    );
    const result = await plugin.definition.filters!["prompt:modify"]!(
      ctx,
      "Tell me a joke",
    );
    expect(result).toBe("Be concise.\n\nTell me a joke");
  });

  it("returns prompt unchanged when system prompt is empty", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockReturnValue("");
    expect(
      await plugin.definition.filters!["prompt:modify"]!(ctx, "Hello"),
    ).toBe("Hello");
  });

  it("returns non-string values unchanged regardless of system prompt", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockReturnValue("system");
    const obj = { type: "structured" };
    expect(await plugin.definition.filters!["prompt:modify"]!(ctx, obj)).toBe(
      obj,
    );
  });
});

// ── response:modify filter ────────────────────────────────────────────────────

describe("response:modify filter", () => {
  it("injects _widget field into object responses", async () => {
    const ctx = makeCtx();
    const result = await plugin.definition.filters!["response:modify"]!(ctx, {
      text: "hello",
    });
    expect(result).toEqual({ text: "hello", _widget: "ai-chat-widget" });
  });

  it("leaves string responses unchanged", async () => {
    const ctx = makeCtx();
    expect(
      await plugin.definition.filters!["response:modify"]!(ctx, "raw string"),
    ).toBe("raw string");
  });

  it("leaves null unchanged", async () => {
    const ctx = makeCtx();
    expect(
      await plugin.definition.filters!["response:modify"]!(ctx, null),
    ).toBeNull();
  });
});

// ── Endpoint handlers ─────────────────────────────────────────────────────────

describe("endpoint handlers (via app:init closure)", () => {
  it("GET /config returns widget config values", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, any> = {
        model: "gpt-4o",
        streamingEnabled: false,
        maxHistory: 10,
      };
      return cfg[k];
    });
    const [ep] = (await initEndpoints(ctx)).filter(
      (e) => e.method === "GET" && e.path === "/config",
    );
    const res = makeRes();
    await ep.handler(fakeReq(), res);
    expect(res._data.widgetId).toBe("ai-chat-widget");
    expect(res._data.model).toBe("gpt-4o");
    expect(res._data.streamingEnabled).toBe(false);
    expect(res._data.maxHistory).toBe(10);
  });

  it("POST /session creates and returns a session with status 201", async () => {
    const ctx = makeCtx();
    const eps = await initEndpoints(ctx);
    const ep = eps.find((e) => e.method === "POST" && e.path === "/session")!;
    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        path: "/session",
        user: { id: "u42", email: "u@x.com", role: "user" },
      }),
      res,
    );
    expect(res._status).toBe(201);
    expect(res._data).toMatchObject({
      id: expect.any(String),
      userId: "u42",
      appId: "app1",
      messages: [],
    });
  });

  it("GET /session/:id returns 404 when session does not exist", async () => {
    const ctx = makeCtx();
    const eps = await initEndpoints(ctx);
    const ep = eps.find(
      (e) => e.method === "GET" && e.path === "/session/:id",
    )!;
    const res = makeRes();
    await ep.handler(fakeReq({ params: { id: "ghost" } }), res);
    expect(res._status).toBe(404);
    expect(res._data.error).toBeDefined();
  });

  it("GET /session/:id returns the session when it exists", async () => {
    const ctx = makeCtx();
    const session: ChatSession = {
      id: "s99",
      appId: "app1",
      userId: "user1",
      messages: [],
      model: DEFAULT_MODEL,
      createdAt: 0,
      updatedAt: 0,
    };
    await ctx.api.db.set(buildSessionKey("s99"), session);

    const eps = await initEndpoints(ctx);
    const ep = eps.find(
      (e) => e.method === "GET" && e.path === "/session/:id",
    )!;
    const res = makeRes();
    await ep.handler(fakeReq({ params: { id: "s99" } }), res);
    expect(res._data).toMatchObject({ id: "s99" });
  });

  it("DELETE /session/:id returns 404 when session does not exist", async () => {
    const ctx = makeCtx();
    const eps = await initEndpoints(ctx);
    const ep = eps.find(
      (e) => e.method === "DELETE" && e.path === "/session/:id",
    )!;
    const res = makeRes();
    await ep.handler(fakeReq({ params: { id: "ghost" } }), res);
    expect(res._status).toBe(404);
  });

  it("DELETE /session/:id deletes the session and returns 204", async () => {
    const ctx = makeCtx();
    await ctx.api.db.set(buildSessionKey("del1"), { id: "del1" });

    const eps = await initEndpoints(ctx);
    const ep = eps.find(
      (e) => e.method === "DELETE" && e.path === "/session/:id",
    )!;
    const res = makeRes();
    await ep.handler(fakeReq({ params: { id: "del1" } }), res);
    expect(res._status).toBe(204);

    // Confirm removed from store
    expect(await ctx.api.db.get(buildSessionKey("del1"))).toBeNull();
  });
});
