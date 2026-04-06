/// <reference types="jest" />
/**
 * User Feedback Collector — Unit Tests
 *
 * Covers: DB key helpers, todayUtc, isoWeek, yearMonth, normaliseRating,
 * updateStats, buildCsvRow, plugin manifest/settings, app:init (4 endpoints),
 * POST /feedback (success, missing fields, bad rating, requireComment),
 * GET /feedback (no filter, conversationId filter, model filter, date filter),
 * GET /stats (group by day / week / month, model filter),
 * GET /export (empty, with records, CSV format),
 * response:modify filter.
 */
import plugin, {
  buildFeedbackKey,
  buildStatsKey,
  todayUtc,
  isoWeek,
  yearMonth,
  normaliseRating,
  updateStats,
  buildCsvRow,
  CSV_HEADER,
  FEEDBACK_KEY_PREFIX,
  STATS_KEY_PREFIX,
  FeedbackRecord,
  DailyModelStats,
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
    ["enableAutoPrompt", true],
    ["feedbackTypes", "thumbs"],
    ["requireComment", false],
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

// ── DB Key Helpers ────────────────────────────────────────────────────────────

describe("buildFeedbackKey", () => {
  it("formats as feedback:conversationId:messageIndex", () => {
    expect(buildFeedbackKey("conv-1", 0)).toBe("feedback:conv-1:0");
    expect(buildFeedbackKey("conv-abc", 42)).toBe("feedback:conv-abc:42");
  });
});

describe("buildStatsKey", () => {
  it("formats as stats:daily:date:model", () => {
    expect(buildStatsKey("2025-06-01", "openai/gpt-4o")).toBe(
      "stats:daily:2025-06-01:openai/gpt-4o",
    );
  });
});

// ── todayUtc ──────────────────────────────────────────────────────────────────

describe("todayUtc", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayUtc(new Date("2025-06-15T10:00:00Z").getTime())).toBe(
      "2025-06-15",
    );
  });

  it("returns current date when no arg given", () => {
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── isoWeek ───────────────────────────────────────────────────────────────────

describe("isoWeek", () => {
  it("returns YYYY-WNN format", () => {
    expect(isoWeek("2025-01-01")).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("groups two days in same week", () => {
    // 2025-06-04 (day 155) and 2025-06-10 (day 161) both yield ceil(n/7) = 23
    const w1 = isoWeek("2025-06-04");
    const w2 = isoWeek("2025-06-10");
    expect(w1).toBe(w2);
  });

  it("gives different weeks for days in different weeks", () => {
    const w1 = isoWeek("2025-06-01");
    const w2 = isoWeek("2025-06-09");
    expect(w1).not.toBe(w2);
  });
});

// ── yearMonth ─────────────────────────────────────────────────────────────────

describe("yearMonth", () => {
  it("returns YYYY-MM", () => {
    expect(yearMonth("2025-06-15")).toBe("2025-06");
    expect(yearMonth("2024-12-31")).toBe("2024-12");
  });
});

// ── normaliseRating ───────────────────────────────────────────────────────────

describe("normaliseRating", () => {
  describe("thumbs type", () => {
    it("maps 'up' → numeric 2", () => {
      const r = normaliseRating("up", "thumbs");
      expect(r).not.toBeNull();
      expect(r!.numeric).toBe(2);
      expect(r!.raw).toBe("up");
    });

    it("maps 'down' → numeric 1", () => {
      const r = normaliseRating("down", "thumbs");
      expect(r!.numeric).toBe(1);
      expect(r!.raw).toBe("down");
    });

    it("returns null for invalid value", () => {
      expect(normaliseRating("maybe", "thumbs")).toBeNull();
      expect(normaliseRating(3, "thumbs")).toBeNull();
      expect(normaliseRating(null, "thumbs")).toBeNull();
    });
  });

  describe("stars type", () => {
    it("maps integer 1–5 through as-is", () => {
      for (let i = 1; i <= 5; i++) {
        const r = normaliseRating(i, "stars");
        expect(r).not.toBeNull();
        expect(r!.numeric).toBe(i);
        expect(r!.raw).toBe(i);
      }
    });

    it("returns null for out-of-range values", () => {
      expect(normaliseRating(0, "stars")).toBeNull();
      expect(normaliseRating(6, "stars")).toBeNull();
    });

    it("returns null for non-integers", () => {
      expect(normaliseRating(2.5, "stars")).toBeNull();
    });
  });

  describe("both type", () => {
    it("accepts thumbs values", () => {
      expect(normaliseRating("up", "both")).not.toBeNull();
      expect(normaliseRating("down", "both")).not.toBeNull();
    });

    it("accepts star values", () => {
      expect(normaliseRating(4, "both")).not.toBeNull();
    });
  });
});

// ── updateStats ───────────────────────────────────────────────────────────────

describe("updateStats", () => {
  it("creates a new record when none exists", () => {
    const rec = updateStats(null, "gpt-4o", "2025-06-01", 2);
    expect(rec.count).toBe(1);
    expect(rec.ratingSum).toBe(2);
    expect(rec.avgRating).toBe(2);
    expect(rec.model).toBe("gpt-4o");
    expect(rec.date).toBe("2025-06-01");
  });

  it("increments existing record", () => {
    const existing: DailyModelStats = {
      model: "gpt-4o",
      date: "2025-06-01",
      ratingSum: 4,
      count: 2,
      avgRating: 2,
    };
    const rec = updateStats(existing, "gpt-4o", "2025-06-01", 1);
    expect(rec.count).toBe(3);
    expect(rec.ratingSum).toBe(5);
    expect(rec.avgRating).toBeCloseTo(5 / 3);
  });

  it("computes correct average with multiple updates", () => {
    let rec: DailyModelStats | null = null;
    rec = updateStats(rec, "m", "2025-01-01", 2);
    rec = updateStats(rec, "m", "2025-01-01", 2);
    rec = updateStats(rec, "m", "2025-01-01", 1);
    expect(rec.count).toBe(3);
    expect(rec.avgRating).toBeCloseTo(5 / 3);
  });
});

// ── buildCsvRow ───────────────────────────────────────────────────────────────

describe("buildCsvRow", () => {
  it("produces a comma-separated row with 8 fields", () => {
    const record: FeedbackRecord = {
      conversationId: "conv-1",
      messageIndex: 0,
      rating: 2,
      rawRating: "up",
      comment: "Great!",
      model: "gpt-4o",
      userId: "u1",
      timestamp: new Date("2025-06-01T12:00:00Z").getTime(),
    };
    const row = buildCsvRow(record);
    const cols = row.split(",");
    expect(cols).toHaveLength(8);
    expect(cols[0]).toBe("conv-1");
    expect(cols[2]).toBe("up");
  });

  it("escapes commas in comment field", () => {
    const record: FeedbackRecord = {
      conversationId: "c",
      messageIndex: 0,
      rating: 1,
      rawRating: "down",
      comment: "bad, really bad",
      model: "m",
      userId: "u",
      timestamp: Date.now(),
    };
    const row = buildCsvRow(record);
    expect(row).toContain('"bad, really bad"');
  });

  it("escapes double-quotes in comment", () => {
    const record: FeedbackRecord = {
      conversationId: "c",
      messageIndex: 0,
      rating: 2,
      rawRating: "up",
      comment: 'She said "hello"',
      model: "m",
      userId: "u",
      timestamp: Date.now(),
    };
    const row = buildCsvRow(record);
    expect(row).toContain('"She said ""hello"""');
  });

  it("handles missing optional fields gracefully", () => {
    const record: FeedbackRecord = {
      conversationId: "c",
      messageIndex: 1,
      rating: 2,
      rawRating: "up",
      timestamp: 0,
    };
    // Should not throw
    expect(() => buildCsvRow(record)).not.toThrow();
  });
});

describe("CSV_HEADER", () => {
  it("has 8 columns", () => {
    expect(CSV_HEADER.split(",")).toHaveLength(8);
  });
});

// ── Plugin manifest ───────────────────────────────────────────────────────────

describe("plugin manifest", () => {
  it("has correct name", () => {
    expect(plugin.manifest.name).toBe("user-feedback-collector");
  });

  it("has correct version", () => {
    expect(plugin.manifest.version).toBe("1.0.0");
  });

  it("has a description", () => {
    expect((plugin.manifest.description ?? "").length).toBeGreaterThan(10);
  });
});

// ── Plugin settings ───────────────────────────────────────────────────────────

describe("plugin settings", () => {
  const settings = plugin.definition.settings!;

  it("defines exactly 3 settings", () => {
    expect(Object.keys(settings)).toHaveLength(3);
  });

  it("has enableAutoPrompt as boolean", () => {
    expect((settings["enableAutoPrompt"] as { type: string }).type).toBe(
      "boolean",
    );
  });

  it("has feedbackTypes as select", () => {
    expect((settings["feedbackTypes"] as { type: string }).type).toBe("select");
  });

  it("has requireComment as boolean with default false", () => {
    const s = settings["requireComment"] as { type: string; default: unknown };
    expect(s.type).toBe("boolean");
    expect(s.default).toBe(false);
  });
});

// ── app:init — endpoint registration ─────────────────────────────────────────

describe("app:init", () => {
  it("registers exactly 4 endpoints", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(ctx.api._endpoints).toHaveLength(4);
  });

  it("registers POST /feedback", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "POST", "/feedback")).not.toThrow();
  });

  it("registers GET /feedback", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "GET", "/feedback")).not.toThrow();
  });

  it("registers GET /stats", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "GET", "/stats")).not.toThrow();
  });

  it("registers GET /export", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(() => getEndpoint(ctx.api, "GET", "/export")).not.toThrow();
  });

  it("all endpoints require auth", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    for (const ep of ctx.api._endpoints) {
      expect(ep.auth).toBe(true);
    }
  });
});

// ── POST /feedback ────────────────────────────────────────────────────────────

describe("POST /feedback", () => {
  it("returns 400 when conversationId missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({ body: { messageIndex: 0, rating: "up" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 400 when messageIndex missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({ body: { conversationId: "c1", rating: "up" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 400 for invalid rating", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: { conversationId: "c1", messageIndex: 0, rating: "maybe" },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("saves feedback record and returns 201 on success", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: {
          conversationId: "conv-1",
          messageIndex: 2,
          rating: "up",
          model: "gpt-4o",
        },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
    const body = res._body as { ok: boolean; feedback: FeedbackRecord };
    expect(body.ok).toBe(true);
    expect(body.feedback.rawRating).toBe("up");
    expect(body.feedback.rating).toBe(2);

    const saved = (await ctx.api.db.get(
      buildFeedbackKey("conv-1", 2),
    )) as FeedbackRecord;
    expect(saved).not.toBeNull();
  });

  it("updates daily stats on submission", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: {
          conversationId: "c",
          messageIndex: 0,
          rating: "up",
          model: "gpt-4o",
        },
      }),
      res as unknown as EndpointResponse,
    );

    const today = todayUtc();
    const statsKey = buildStatsKey(today, "gpt-4o");
    const stats = (await ctx.api.db.get(statsKey)) as DailyModelStats;
    expect(stats).not.toBeNull();
    expect(stats.count).toBe(1);
    expect(stats.ratingSum).toBe(2);
  });

  it("returns 400 when requireComment=true and no comment given", async () => {
    const ctx = makeCtx({}, { requireComment: true });
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: { conversationId: "c", messageIndex: 0, rating: "up" },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("accepts comment when requireComment=true", async () => {
    const ctx = makeCtx({}, { requireComment: true });
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: {
          conversationId: "c",
          messageIndex: 0,
          rating: "up",
          comment: "Great response!",
        },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
  });

  it("accepts star ratings when feedbackTypes=stars", async () => {
    const ctx = makeCtx({}, { feedbackTypes: "stars" });
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: { conversationId: "c", messageIndex: 0, rating: 4 },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
    const body = res._body as { feedback: FeedbackRecord };
    expect(body.feedback.rating).toBe(4);
  });

  it("stores userId from context", async () => {
    const ctx = makeCtx({ userId: "user-99" });
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        body: { conversationId: "c", messageIndex: 0, rating: "down" },
      }),
      res as unknown as EndpointResponse,
    );
    const saved = (await ctx.api.db.get(
      buildFeedbackKey("c", 0),
    )) as FeedbackRecord;
    expect(saved.userId).toBe("user-99");
  });
});

// ── GET /feedback ─────────────────────────────────────────────────────────────

async function seedFeedback(
  ctx: MockCtx,
  records: Partial<FeedbackRecord>[],
): Promise<void> {
  for (const r of records) {
    const full: FeedbackRecord = {
      conversationId: r.conversationId ?? "conv-1",
      messageIndex: r.messageIndex ?? 0,
      rating: r.rating ?? 2,
      rawRating: r.rawRating ?? "up",
      comment: r.comment,
      model: r.model,
      userId: r.userId,
      timestamp: r.timestamp ?? Date.now(),
    };
    await ctx.api.db.set(
      buildFeedbackKey(full.conversationId, full.messageIndex),
      full,
    );
  }
}

describe("GET /feedback", () => {
  it("returns empty array when no records", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/feedback");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect((res._body as { feedback: unknown[] }).feedback).toEqual([]);
  });

  it("returns all records when no filter", async () => {
    const ctx = makeCtx();
    await seedFeedback(ctx, [
      { conversationId: "c1", messageIndex: 0 },
      { conversationId: "c2", messageIndex: 0 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/feedback");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    const body = res._body as { feedback: FeedbackRecord[]; total: number };
    expect(body.feedback).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("filters by conversationId", async () => {
    const ctx = makeCtx();
    await seedFeedback(ctx, [
      { conversationId: "c1", messageIndex: 0 },
      { conversationId: "c2", messageIndex: 0 },
      { conversationId: "c1", messageIndex: 1 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { conversationId: "c1" } }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { feedback: FeedbackRecord[] };
    expect(body.feedback).toHaveLength(2);
    expect(body.feedback.every((r) => r.conversationId === "c1")).toBe(true);
  });

  it("filters by model", async () => {
    const ctx = makeCtx();
    await seedFeedback(ctx, [
      { conversationId: "c1", messageIndex: 0, model: "gpt-4o" },
      { conversationId: "c1", messageIndex: 1, model: "claude-3-5-sonnet" },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { model: "gpt-4o" } }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { feedback: FeedbackRecord[] };
    expect(body.feedback).toHaveLength(1);
    expect(body.feedback[0]!.model).toBe("gpt-4o");
  });

  it("filters by from date", async () => {
    const now = Date.now();
    const ctx = makeCtx();
    await seedFeedback(ctx, [
      { conversationId: "c1", messageIndex: 0, timestamp: now - 10_000 },
      { conversationId: "c1", messageIndex: 1, timestamp: now },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({
        query: { from: new Date(now - 5_000).toISOString() },
      }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { feedback: FeedbackRecord[] };
    expect(body.feedback).toHaveLength(1);
  });

  it("respects limit parameter", async () => {
    const ctx = makeCtx();
    await seedFeedback(ctx, [
      { conversationId: "c1", messageIndex: 0 },
      { conversationId: "c2", messageIndex: 0 },
      { conversationId: "c3", messageIndex: 0 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/feedback");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { limit: "2" } }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { feedback: FeedbackRecord[]; total: number };
    expect(body.feedback).toHaveLength(2);
    expect(body.total).toBe(3); // total reflects unsliced count
  });
});

// ── GET /stats ────────────────────────────────────────────────────────────────

async function seedStats(
  ctx: MockCtx,
  records: Partial<DailyModelStats>[],
): Promise<void> {
  for (const r of records) {
    const full: DailyModelStats = {
      model: r.model ?? "gpt-4o",
      date: r.date ?? "2025-06-01",
      ratingSum: r.ratingSum ?? 4,
      count: r.count ?? 2,
      avgRating: r.avgRating ?? 2,
    };
    await ctx.api.db.set(buildStatsKey(full.date, full.model), full);
  }
}

describe("GET /stats", () => {
  it("returns empty stats when no data", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/stats");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect((res._body as { stats: unknown[] }).stats).toEqual([]);
  });

  it("groups by day by default", async () => {
    const ctx = makeCtx();
    await seedStats(ctx, [
      { model: "gpt-4o", date: "2025-06-01", ratingSum: 4, count: 2 },
      { model: "gpt-4o", date: "2025-06-02", ratingSum: 3, count: 2 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/stats");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    const body = res._body as { stats: { period: string }[]; groupBy: string };
    expect(body.groupBy).toBe("day");
    expect(body.stats).toHaveLength(2);
    // Sorted descending by period
    expect(body.stats[0]!.period).toBe("2025-06-02");
  });

  it("groups by week", async () => {
    const ctx = makeCtx();
    // Same calendar week
    await seedStats(ctx, [
      { model: "gpt-4o", date: "2025-06-02", ratingSum: 4, count: 2 },
      { model: "gpt-4o", date: "2025-06-03", ratingSum: 2, count: 1 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/stats");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { groupBy: "week" } }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { stats: { count: number }[] };
    // Both days folded into one week entry
    expect(body.stats).toHaveLength(1);
    expect(body.stats[0]!.count).toBe(3);
  });

  it("groups by month", async () => {
    const ctx = makeCtx();
    await seedStats(ctx, [
      { model: "m", date: "2025-06-01", ratingSum: 4, count: 2 },
      { model: "m", date: "2025-06-15", ratingSum: 2, count: 1 },
      { model: "m", date: "2025-07-01", ratingSum: 3, count: 1 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/stats");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { groupBy: "month" } }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { stats: { period: string; count: number }[] };
    expect(body.stats).toHaveLength(2);
    const june = body.stats.find((s) => s.period === "2025-06");
    expect(june!.count).toBe(3);
  });

  it("filters by model", async () => {
    const ctx = makeCtx();
    await seedStats(ctx, [
      { model: "gpt-4o", date: "2025-06-01" },
      { model: "claude", date: "2025-06-01" },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/stats");
    const res = makeRes();
    await ep.handler(
      makeReq({ query: { model: "gpt-4o" } }),
      res as unknown as EndpointResponse,
    );
    const body = res._body as { stats: { model: string }[] };
    expect(body.stats).toHaveLength(1);
    expect(body.stats[0]!.model).toBe("gpt-4o");
  });

  it("computes correct avgRating in aggregated buckets", async () => {
    const ctx = makeCtx();
    await seedStats(ctx, [
      { model: "m", date: "2025-06-01", ratingSum: 6, count: 3, avgRating: 2 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/stats");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    const body = res._body as { stats: { avgRating: number }[] };
    expect(body.stats[0]!.avgRating).toBeCloseTo(2);
  });
});

// ── GET /export ───────────────────────────────────────────────────────────────

describe("GET /export", () => {
  it("returns 200 with CSV wrapper object", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/export");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    const body = res._body as Record<string, unknown>;
    expect(body._csv).toBe(true);
    expect(body.contentType).toBe("text/csv");
  });

  it("returns only header row when no feedback exists", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/export");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    const body = res._body as { data: string };
    expect(body.data.trim()).toBe(CSV_HEADER);
  });

  it("includes one data row per feedback record", async () => {
    const ctx = makeCtx();
    await seedFeedback(ctx, [
      { conversationId: "c1", messageIndex: 0 },
      { conversationId: "c2", messageIndex: 0 },
    ]);
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/export");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    const body = res._body as { data: string };
    const lines = body.data.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2 records
  });

  it("filename contains today's date", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/export");
    const res = makeRes();
    await ep.handler(makeReq(), res as unknown as EndpointResponse);
    const body = res._body as { filename: string };
    expect(body.filename).toMatch(/feedback-export-\d{4}-\d{2}-\d{2}\.csv/);
  });
});

// ── response:modify filter ────────────────────────────────────────────────────

describe("response:modify filter", () => {
  it("injects _feedbackEnabled: true into response", async () => {
    const filter = plugin.definition.filters?.["response:modify"];
    if (!filter) throw new Error("response:modify filter not registered");

    const ctx = makeCtx();
    const result = await filter(ctx, { text: "Hello" });
    expect((result as Record<string, unknown>)["_feedbackEnabled"]).toBe(true);
  });

  it("preserves existing response properties", async () => {
    const filter = plugin.definition.filters?.["response:modify"];
    const ctx = makeCtx();
    const result = await filter!(ctx, { text: "Hello", model: "gpt-4o" });
    const r = result as Record<string, unknown>;
    expect(r["text"]).toBe("Hello");
    expect(r["model"]).toBe("gpt-4o");
  });
});

// ── Key prefix constants ──────────────────────────────────────────────────────

describe("constants", () => {
  it("FEEDBACK_KEY_PREFIX is 'feedback:'", () => {
    expect(FEEDBACK_KEY_PREFIX).toBe("feedback:");
  });

  it("STATS_KEY_PREFIX is 'stats:daily:'", () => {
    expect(STATS_KEY_PREFIX).toBe("stats:daily:");
  });
});
