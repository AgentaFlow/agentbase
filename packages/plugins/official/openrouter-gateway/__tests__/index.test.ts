/// <reference types="jest" />
/**
 * OpenRouter Gateway — Unit Tests
 *
 * Covers: DB key helpers, todayUtc, estimateCostCents, buildHeaders,
 * callModel (success + HTTP error), callWithFallback (primary success,
 * fallback on 429/5xx, all fail), fetchModels (cache hit / miss / fetch),
 * plugin manifest/settings, app:init (5 endpoints),
 * GET /models, GET /usage, PUT /config, GET /config, POST /test,
 * conversation:beforeMessage hook.
 */
import plugin, {
  buildUsageKey,
  buildConfigKey,
  todayUtc,
  estimateCostCents,
  buildHeaders,
  callModel,
  callWithFallback,
  fetchModels,
  OPENROUTER_BASE,
  MODELS_CACHE_KEY,
  MODELS_CACHE_TTL_MS,
  DEFAULT_MAX_COST_CENTS,
  OpenRouterModel,
  OpenRouterChatMessage,
  OpenRouterCompletionResponse,
  ModelsCacheRecord,
  GatewayConfig,
  DailyUsage,
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

function createMockAPI(
  configOverrides: Record<string, unknown> = {},
): PluginAPI & { _endpoints: EndpointDefinition[] } {
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

  const defaultConfig = new Map<string, unknown>([
    ["openRouterApiKey", "sk-test-key"],
    ["defaultModel", "openai/gpt-4o"],
    ["fallbackModels", "openai/gpt-4o-mini,anthropic/claude-3-5-haiku"],
    ["maxCostPerRequest", 0.5],
    ["siteUrl", "https://example.com"],
    ["appName", "TestApp"],
    ...Object.entries(configOverrides),
  ]);

  return {
    _endpoints,
    getConfig: jest
      .fn()
      .mockImplementation((k: string) => defaultConfig.get(k) ?? undefined),
    setConfig: jest
      .fn()
      .mockImplementation(async (k: string, v: unknown) =>
        defaultConfig.set(k, v),
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

function makeCtx(
  overrides: Partial<PluginContext> = {},
  configOverrides: Record<string, unknown> = {},
): MockCtx {
  const api = createMockAPI(configOverrides);
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

// Build a minimal completion response
function makeCompletion(
  model = "openai/gpt-4o",
  content = "Hello!",
): OpenRouterCompletionResponse {
  return {
    id: "chat-1",
    model,
    choices: [
      {
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

describe("buildUsageKey", () => {
  it("formats as usage:userId:date", () => {
    expect(buildUsageKey("user-42", "2025-01-15")).toBe(
      "usage:user-42:2025-01-15",
    );
  });

  it("handles special characters in userId", () => {
    expect(buildUsageKey("u/1", "2025-06-01")).toBe("usage:u/1:2025-06-01");
  });
});

describe("buildConfigKey", () => {
  it("formats as config:appId", () => {
    expect(buildConfigKey("app-abc")).toBe("config:app-abc");
  });
});

// ── todayUtc ──────────────────────────────────────────────────────────────────

describe("todayUtc", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = todayUtc(new Date("2025-06-15T10:30:00Z").getTime());
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe("2025-06-15");
  });

  it("uses current time when no argument given", () => {
    // Just check format is correct
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns UTC date not local date", () => {
    // ~00:30 UTC would give tomorrow in UTC+1 but today in UTC+0
    const date = todayUtc(new Date("2025-03-01T00:30:00Z").getTime());
    expect(date).toBe("2025-03-01");
  });
});

// ── estimateCostCents ─────────────────────────────────────────────────────────

describe("estimateCostCents", () => {
  it("calculates cents from token counts and per-token prices", () => {
    // 1000 prompt tokens @ $0.000001 + 500 completion @ $0.000002
    // = 0.001 + 0.001 = 0.002 USD = 0.2 cents → ceil = 1
    const result = estimateCostCents(1000, 500, "0.000001", "0.000002");
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 when both prices are zero string", () => {
    expect(estimateCostCents(1000, 1000, "0", "0")).toBe(0);
  });

  it("returns 0 when both prices are empty string", () => {
    expect(estimateCostCents(100, 100, "", "")).toBe(0);
  });

  it("rounds up fractional cents", () => {
    // 1 token @ 0.000001 = 0.0001 cents → ceil = 1
    const result = estimateCostCents(1, 0, "0.000001", "0");
    expect(result).toBe(1);
  });

  it("handles larger token counts", () => {
    // 100k prompt @ 0.000001 + 50k completion @ 0.000002 = 0.1 + 0.1 = 0.2 USD = 20 cents
    const result = estimateCostCents(100_000, 50_000, "0.000001", "0.000002");
    expect(result).toBe(20);
  });
});

// ── buildHeaders ──────────────────────────────────────────────────────────────

describe("buildHeaders", () => {
  it("includes Authorization header", () => {
    const h = buildHeaders("my-key", "", "");
    expect(h["Authorization"]).toBe("Bearer my-key");
  });

  it("includes Content-Type", () => {
    const h = buildHeaders("k", "", "");
    expect(h["Content-Type"]).toBe("application/json");
  });

  it("includes HTTP-Referer when siteUrl provided", () => {
    const h = buildHeaders("k", "https://example.com", "");
    expect(h["HTTP-Referer"]).toBe("https://example.com");
  });

  it("omits HTTP-Referer when siteUrl empty", () => {
    const h = buildHeaders("k", "", "App");
    expect(h["HTTP-Referer"]).toBeUndefined();
  });

  it("includes X-Title when appName provided", () => {
    const h = buildHeaders("k", "", "MyApp");
    expect(h["X-Title"]).toBe("MyApp");
  });

  it("omits X-Title when appName empty", () => {
    const h = buildHeaders("k", "https://site.com", "");
    expect(h["X-Title"]).toBeUndefined();
  });
});

// ── callModel ─────────────────────────────────────────────────────────────────

describe("callModel", () => {
  it("returns parsed response on 200", async () => {
    const completion = makeCompletion();
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(completion),
    });

    const result = await callModel(makeRequest, "key", "", "", {
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.model).toBe("openai/gpt-4o");
    expect(result.choices[0]?.message.content).toBe("Hello!");
  });

  it("posts to the correct URL", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(makeCompletion()),
    });

    await callModel(makeRequest, "k", "", "", {
      model: "openai/gpt-4o",
      messages: [],
    });

    expect(makeRequest).toHaveBeenCalledWith(
      `${OPENROUTER_BASE}/chat/completions`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on HTTP 429", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: jest.fn(),
    });

    await expect(
      callModel(makeRequest, "k", "", "", {
        model: "openai/gpt-4o",
        messages: [],
      }),
    ).rejects.toThrow("429");
  });

  it("throws on HTTP 500", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn(),
    });

    await expect(
      callModel(makeRequest, "k", "", "", { model: "m", messages: [] }),
    ).rejects.toThrow("500");
  });

  it("throws on HTTP 401 (auth failure)", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    });

    await expect(
      callModel(makeRequest, "bad-key", "", "", { model: "m", messages: [] }),
    ).rejects.toThrow("401");
  });

  it("passes API key in Authorization header", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(makeCompletion()),
    });

    await callModel(makeRequest, "sk-abc", "", "", {
      model: "m",
      messages: [],
    });

    const opts = makeRequest.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = opts?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-abc");
  });
});

// ── callWithFallback ──────────────────────────────────────────────────────────

describe("callWithFallback", () => {
  it("returns primary model result when it succeeds", async () => {
    const completion = makeCompletion("openai/gpt-4o");
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(completion),
    });

    const result = await callWithFallback(
      makeRequest,
      "key",
      "",
      "",
      [{ role: "user", content: "Hi" }],
      "openai/gpt-4o",
      ["openai/gpt-4o-mini"],
    );

    expect(result.model).toBe("openai/gpt-4o");
    // Should only call once (primary succeeded)
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it("falls back to second model on 429 from primary", async () => {
    const makeRequest = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: jest.fn() })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(makeCompletion("openai/gpt-4o-mini")),
      });

    const result = await callWithFallback(
      makeRequest,
      "key",
      "",
      "",
      [{ role: "user", content: "Hi" }],
      "openai/gpt-4o",
      ["openai/gpt-4o-mini"],
    );

    expect(result.model).toBe("openai/gpt-4o-mini");
    expect(makeRequest).toHaveBeenCalledTimes(2);
  });

  it("falls back to second model on 500 from primary", async () => {
    const makeRequest = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: jest.fn() })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(makeCompletion("fallback-model")),
      });

    const result = await callWithFallback(
      makeRequest,
      "key",
      "",
      "",
      [],
      "primary",
      ["fallback-model"],
    );

    expect(result.model).toBe("fallback-model");
  });

  it("falls back through multiple models until one succeeds", async () => {
    const makeRequest = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: jest.fn() })
      .mockResolvedValueOnce({ ok: false, status: 503, json: jest.fn() })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(makeCompletion("third-model")),
      });

    const result = await callWithFallback(
      makeRequest,
      "key",
      "",
      "",
      [],
      "model-a",
      ["model-b", "third-model"],
    );

    expect(result.model).toBe("third-model");
    expect(makeRequest).toHaveBeenCalledTimes(3);
  });

  it("throws when all models in chain fail with retryable errors", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn(),
    });

    await expect(
      callWithFallback(makeRequest, "k", "", "", [], "m1", ["m2"]),
    ).rejects.toThrow("503");
  });

  it("throws immediately on non-retryable error (401) without trying fallbacks", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    });

    await expect(
      callWithFallback(makeRequest, "bad-key", "", "", [], "m1", ["m2"]),
    ).rejects.toThrow("401");

    // 401 is not retryable — only called once
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it("works with empty fallback list (primary only)", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(makeCompletion("only-model")),
    });

    const result = await callWithFallback(
      makeRequest,
      "key",
      "",
      "",
      [],
      "only-model",
      [],
    );
    expect(result.model).toBe("only-model");
  });
});

// ── fetchModels ───────────────────────────────────────────────────────────────

const SAMPLE_MODELS: OpenRouterModel[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    pricing: { prompt: "0.000001", completion: "0.000002" },
    context_length: 128000,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    pricing: { prompt: "0.0000001", completion: "0.0000002" },
    context_length: 128000,
  },
];

describe("fetchModels", () => {
  it("returns cached models when cache is fresh", async () => {
    const makeRequest = jest.fn();
    const cachedAt = Date.now() - 1000; // 1 second ago — fresh
    const cached: ModelsCacheRecord = { models: SAMPLE_MODELS, cachedAt };

    const result = await fetchModels(
      makeRequest,
      "k",
      "",
      "",
      cached,
      Date.now(),
    );

    expect(result).toBe(SAMPLE_MODELS);
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it("fetches fresh models when cache is stale (> 1 hour)", async () => {
    const freshModels: OpenRouterModel[] = [
      { id: "new-model", name: "New Model" },
    ];
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: freshModels }),
    });

    const staleCache: ModelsCacheRecord = {
      models: SAMPLE_MODELS,
      cachedAt: Date.now() - MODELS_CACHE_TTL_MS - 1,
    };

    const result = await fetchModels(
      makeRequest,
      "k",
      "",
      "",
      staleCache,
      Date.now(),
    );

    expect(result).toEqual(freshModels);
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it("fetches when no cache record", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: SAMPLE_MODELS }),
    });

    const result = await fetchModels(
      makeRequest,
      "k",
      "",
      "",
      null,
      Date.now(),
    );

    expect(result).toEqual(SAMPLE_MODELS);
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it("throws when HTTP request fails", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn(),
    });

    await expect(
      fetchModels(makeRequest, "k", "", "", null, Date.now()),
    ).rejects.toThrow("503");
  });

  it("requests the correct models URL", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });

    await fetchModels(makeRequest, "k", "", "", null, Date.now());

    expect(makeRequest).toHaveBeenCalledWith(
      `${OPENROUTER_BASE}/models`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer k" }),
      }),
    );
  });
});

// ── Plugin manifest ───────────────────────────────────────────────────────────

describe("plugin manifest", () => {
  it("has correct name", () => {
    expect(plugin.manifest.name).toBe("openrouter-gateway");
  });

  it("has correct version", () => {
    expect(plugin.manifest.version).toBe("1.0.0");
  });

  it("has a description", () => {
    expect(typeof plugin.manifest.description).toBe("string");
    expect((plugin.manifest.description ?? "").length).toBeGreaterThan(10);
  });
});

// ── Plugin settings ───────────────────────────────────────────────────────────

describe("plugin settings", () => {
  const settings = plugin.definition.settings!;

  it("defines exactly 6 settings", () => {
    expect(Object.keys(settings)).toHaveLength(6);
  });

  it("has openRouterApiKey with encrypted flag", () => {
    expect(settings["openRouterApiKey"]).toBeDefined();
    expect(
      (settings["openRouterApiKey"] as { encrypted?: boolean }).encrypted,
    ).toBe(true);
  });

  it("has defaultModel with a default value", () => {
    expect(settings["defaultModel"]).toBeDefined();
    expect(
      (settings["defaultModel"] as { default?: unknown }).default,
    ).toBeTruthy();
  });

  it("has fallbackModels as string type (comma-separated)", () => {
    expect((settings["fallbackModels"] as { type: string }).type).toBe(
      "string",
    );
  });

  it("has maxCostPerRequest as number type", () => {
    expect((settings["maxCostPerRequest"] as { type: string }).type).toBe(
      "number",
    );
  });

  it("has siteUrl setting", () => {
    expect(settings["siteUrl"]).toBeDefined();
  });

  it("has appName setting", () => {
    expect(settings["appName"]).toBeDefined();
  });
});

// ── app:init — endpoint registration ─────────────────────────────────────────

describe("app:init", () => {
  it("registers exactly 5 endpoints", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(ctx.api._endpoints).toHaveLength(5);
  });

  it("registers GET /models", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "GET", "/models")).not.toThrow();
  });

  it("registers GET /usage", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "GET", "/usage")).not.toThrow();
  });

  it("registers PUT /config", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "PUT", "/config")).not.toThrow();
  });

  it("registers GET /config", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "GET", "/config")).not.toThrow();
  });

  it("registers POST /test", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "POST", "/test")).not.toThrow();
  });

  it("all endpoints require auth", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    for (const ep of ctx.api._endpoints) {
      expect(ep.auth).toBe(true);
    }
  });
});

// ── GET /models ───────────────────────────────────────────────────────────────

describe("GET /models", () => {
  it("returns 400 when API key not configured", async () => {
    const ctx = makeCtx({}, { openRouterApiKey: "" });
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/models");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(400);
  });

  it("returns cached models from DB without calling API", async () => {
    const ctx = makeCtx();
    await runInit(ctx);

    // Pre-populate cache
    const cache: ModelsCacheRecord = {
      models: SAMPLE_MODELS,
      cachedAt: Date.now() - 1000, // fresh
    };
    await ctx.api.db.set(MODELS_CACHE_KEY, cache);

    const ep = getEndpoint(ctx.api, "GET", "/models");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    expect((res._body as { models: unknown[] }).models).toHaveLength(2);
    // makeRequest should NOT have been called for models
    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("fetches from OpenRouter when cache is stale", async () => {
    const ctx = makeCtx();

    // Prime stale cache
    const staleCache: ModelsCacheRecord = {
      models: SAMPLE_MODELS,
      cachedAt: Date.now() - MODELS_CACHE_TTL_MS - 1000,
    };
    await ctx.api.db.set(MODELS_CACHE_KEY, staleCache);

    // Mock fresh response
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: SAMPLE_MODELS }),
    });

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/models");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    expect(ctx.api.makeRequest).toHaveBeenCalledWith(
      `${OPENROUTER_BASE}/models`,
      expect.anything(),
    );
  });

  it("returns 502 on OpenRouter API error", async () => {
    const ctx = makeCtx();
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn(),
    });

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/models");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(502);
  });
});

// ── GET /usage ────────────────────────────────────────────────────────────────

describe("GET /usage", () => {
  it("returns null when no usage record for user+date", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/usage");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { userId: "u1", date: "2025-06-01" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    expect((res._body as { usage: unknown }).usage).toBeNull();
  });

  it("returns usage record for a specific user+date", async () => {
    const ctx = makeCtx();
    const record: DailyUsage = {
      userId: "u1",
      date: "2025-06-01",
      entries: [
        {
          model: "openai/gpt-4o",
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
          costCents: 1,
          timestamp: Date.now(),
        },
      ],
      totalCostCents: 1,
      totalTokens: 15,
    };
    await ctx.api.db.set("usage:u1:2025-06-01", record);

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/usage");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { userId: "u1", date: "2025-06-01" } }),
      res as unknown as EndpointResponse,
    );

    expect(res._status).toBe(200);
    expect((res._body as { usage: DailyUsage }).usage.totalTokens).toBe(15);
  });

  it("returns empty array when no records exist for aggregate query", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/usage");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { date: "2025-06-01" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    expect((res._body as { usage: unknown[] }).usage).toEqual([]);
  });

  it("aggregates multiple user records for a date", async () => {
    const ctx = makeCtx();
    const record1: DailyUsage = {
      userId: "u1",
      date: "2025-06-01",
      entries: [],
      totalCostCents: 20,
      totalTokens: 100,
    };
    const record2: DailyUsage = {
      userId: "u2",
      date: "2025-06-01",
      entries: [],
      totalCostCents: 5,
      totalTokens: 50,
    };
    await ctx.api.db.set("usage:u1:2025-06-01", record1);
    await ctx.api.db.set("usage:u2:2025-06-01", record2);

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/usage");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { date: "2025-06-01" } }),
      res as unknown as EndpointResponse,
    );

    expect(res._status).toBe(200);
    const body = res._body as { usage: DailyUsage[] };
    expect(body.usage).toHaveLength(2);
    // Sorted by totalCostCents descending
    expect(body.usage[0]!.totalCostCents).toBe(20);
  });
});

// ── PUT /config ───────────────────────────────────────────────────────────────

describe("PUT /config", () => {
  it("returns 400 when no fields provided", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "PUT", "/config");
    const res = makeRes();
    await ep.handler(makeReq({ body: {} }), res as unknown as EndpointResponse);
    expect(res._status).toBe(400);
  });

  it("saves defaultModel to DB", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "PUT", "/config");
    const res = makeRes();
    await ep.handler(
      makeReq({ body: { defaultModel: "anthropic/claude-3-5-sonnet" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    const saved = (await ctx.api.db.get(
      buildConfigKey("app-1"),
    )) as GatewayConfig;
    expect(saved.defaultModel).toBe("anthropic/claude-3-5-sonnet");
  });

  it("parses comma-separated fallbackModels into array", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "PUT", "/config");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: {
          defaultModel: "openai/gpt-4o",
          fallbackModels: "m1, m2, m3",
        },
      }),
      res as unknown as EndpointResponse,
    );
    const saved = (await ctx.api.db.get(
      buildConfigKey("app-1"),
    )) as GatewayConfig;
    expect(saved.fallbackModels).toEqual(["m1", "m2", "m3"]);
  });

  it("converts maxCostPerRequest USD to cents", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "PUT", "/config");
    const res = makeRes();
    await ep.handler(
      makeReq({ body: { defaultModel: "m", maxCostPerRequest: 0.25 } }),
      res as unknown as EndpointResponse,
    );
    const saved = (await ctx.api.db.get(
      buildConfigKey("app-1"),
    )) as GatewayConfig;
    expect(saved.maxCostCents).toBe(25);
  });

  it("returns the updated config in response", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "PUT", "/config");
    const res = makeRes();
    await ep.handler(
      makeReq({ body: { defaultModel: "new-model" } }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { config: GatewayConfig };
    expect(body.config.defaultModel).toBe("new-model");
  });
});

// ── GET /config ───────────────────────────────────────────────────────────────

describe("GET /config", () => {
  it("returns defaults from plugin settings when no DB config saved", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/config");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    const body = res._body as { config: GatewayConfig };
    expect(body.config.defaultModel).toBe("openai/gpt-4o");
  });

  it("returns stored config when saved", async () => {
    const ctx = makeCtx();
    const stored: GatewayConfig = {
      defaultModel: "anthropic/claude-opus",
      fallbackModels: ["openai/gpt-4o"],
      maxCostCents: 100,
      updatedAt: Date.now(),
    };
    await ctx.api.db.set(buildConfigKey("app-1"), stored);

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/config");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    const body = res._body as { config: GatewayConfig };
    expect(body.config.defaultModel).toBe("anthropic/claude-opus");
    expect(body.config.fallbackModels).toEqual(["openai/gpt-4o"]);
    expect(body.config.maxCostCents).toBe(100);
  });
});

// ── POST /test ────────────────────────────────────────────────────────────────

describe("POST /test", () => {
  it("returns 400 when API key not configured", async () => {
    const ctx = makeCtx({}, { openRouterApiKey: "" });
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/test");
    const res = makeRes();
    await ep.handler(makeReq({ body: {} }), res as unknown as EndpointResponse);
    expect(res._status).toBe(400);
  });

  it("returns 200 with model, reply, and usage on success", async () => {
    const ctx = makeCtx();
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest
        .fn()
        .mockResolvedValue(makeCompletion("openai/gpt-4o-mini", "OK")),
    });

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/test");
    const res = makeRes();
    await ep.handler(
      makeReq({ body: { prompt: "Say OK", model: "openai/gpt-4o-mini" } }),
      res as unknown as EndpointResponse,
    );

    expect(res._status).toBe(200);
    const body = res._body as { ok: boolean; model: string; reply: string };
    expect(body.ok).toBe(true);
    expect(body.model).toBe("openai/gpt-4o-mini");
    expect(body.reply).toBe("OK");
  });

  it("returns 502 on OpenRouter API error", async () => {
    const ctx = makeCtx();
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    });

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/test");
    const res = makeRes();
    await ep.handler(makeReq({ body: {} }), res as unknown as EndpointResponse);

    expect(res._status).toBe(502);
    const body = res._body as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it("uses default model when model not specified in body", async () => {
    const ctx = makeCtx();
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(makeCompletion("openai/gpt-4o")),
    });

    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/test");
    const res = makeRes();
    await ep.handler(makeReq({ body: {} }), res as unknown as EndpointResponse);

    const requestBody = JSON.parse(
      (ctx.api.makeRequest as jest.Mock).mock.calls[0]?.[1]?.body as string,
    );
    expect(requestBody.model).toBe("openai/gpt-4o");
  });
});

// ── conversation:beforeMessage ────────────────────────────────────────────────

describe("conversation:beforeMessage hook", () => {
  it("does nothing when API key is not configured", async () => {
    const ctx = makeCtx(
      { message: "Hello" } as unknown as Partial<PluginContext>,
      {
        openRouterApiKey: "",
      },
    );

    const hook = plugin.definition.hooks?.["conversation:beforeMessage"];
    await hook?.(ctx);

    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("does nothing when message is missing from context", async () => {
    const ctx = makeCtx();
    const hook = plugin.definition.hooks?.["conversation:beforeMessage"];
    await hook?.(ctx);

    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("calls OpenRouter with the message content", async () => {
    const ctx = {
      ...makeCtx(),
      message: "What is 2+2?",
    } as MockCtx & { message: string };

    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(makeCompletion()),
    });

    const hook = plugin.definition.hooks?.["conversation:beforeMessage"];
    await hook?.(ctx);

    expect(ctx.api.makeRequest).toHaveBeenCalledWith(
      `${OPENROUTER_BASE}/chat/completions`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("stores usage record after successful completion", async () => {
    const ctx = {
      ...makeCtx(),
      message: "Hello",
      userId: "user-42",
    } as MockCtx & { message: string; userId: string };

    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(makeCompletion()),
    });

    const hook = plugin.definition.hooks?.["conversation:beforeMessage"];
    await hook?.(ctx);

    const today = todayUtc();
    const usageKey = buildUsageKey("user-42", today);
    const record = (await ctx.api.db.get(usageKey)) as DailyUsage | null;
    expect(record).not.toBeNull();
    expect(record!.entries).toHaveLength(1);
    expect(record!.totalTokens).toBe(15);
  });

  it("uses config from DB when stored", async () => {
    const ctx = {
      ...makeCtx(),
      message: "Hi",
    } as MockCtx & { message: string };

    const stored: GatewayConfig = {
      defaultModel: "anthropic/claude-opus",
      fallbackModels: [],
      maxCostCents: 100,
      updatedAt: Date.now(),
    };
    await ctx.api.db.set(buildConfigKey("app-1"), stored);

    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest
        .fn()
        .mockResolvedValue(makeCompletion("anthropic/claude-opus")),
    });

    const hook = plugin.definition.hooks?.["conversation:beforeMessage"];
    await hook?.(ctx);

    const requestBody = JSON.parse(
      (ctx.api.makeRequest as jest.Mock).mock.calls[0]?.[1]?.body as string,
    );
    expect(requestBody.model).toBe("anthropic/claude-opus");
  });

  it("logs error but does not throw on API failure", async () => {
    const ctx = {
      ...makeCtx(),
      message: "Hello",
    } as MockCtx & { message: string };

    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn(),
    });

    const hook = plugin.definition.hooks?.["conversation:beforeMessage"];
    // Should not throw
    await expect(hook?.(ctx)).resolves.not.toThrow();
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("error"),
      "error",
    );
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("OPENROUTER_BASE points to the correct API", () => {
    expect(OPENROUTER_BASE).toBe("https://openrouter.ai/api/v1");
  });

  it("MODELS_CACHE_TTL_MS is 1 hour", () => {
    expect(MODELS_CACHE_TTL_MS).toBe(3_600_000);
  });

  it("DEFAULT_MAX_COST_CENTS is 50 cents", () => {
    expect(DEFAULT_MAX_COST_CENTS).toBe(50);
  });

  it("MODELS_CACHE_KEY is 'models:cache'", () => {
    expect(MODELS_CACHE_KEY).toBe("models:cache");
  });
});
