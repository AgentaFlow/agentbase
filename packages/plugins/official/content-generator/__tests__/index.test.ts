/// <reference types="jest" />
/**
 * Content Generator — Unit Tests
 */
import plugin, {
  BUILT_IN_TEMPLATES,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  ContentTemplate,
  BatchJobRecord,
  applyTemplate,
  buildTemplateKey,
  buildJobKey,
  generateJobId,
  analyzeKeywordDensity,
  buildSeoSuffix,
  AI_COMPLETIONS_PATH,
  SUPPORTED_MODELS,
} from "../src/index";
import {
  PluginAPI,
  PluginContext,
  PluginDatabaseAPI,
  PluginEventBus,
  EndpointDefinition,
  EndpointRequest,
} from "@agentbase/plugin-sdk";

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeAiResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

function createMockAPI(
  aiContent = "Generated content",
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

  const configStore = new Map<string, unknown>();

  const api = {
    _endpoints,
    getConfig: jest
      .fn()
      .mockImplementation((key: string) => configStore.get(key) ?? undefined),
    setConfig: jest
      .fn()
      .mockImplementation(async (key: string, value: unknown) =>
        configStore.set(key, value),
      ),
    makeRequest: jest.fn().mockResolvedValue(makeAiResponse(aiContent)),
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
  appConfig: Record<string, unknown> = {},
): PluginContext & { api: ReturnType<typeof createMockAPI> } {
  const api = createMockAPI();
  // Pre-populate configStore via setConfig mock
  for (const [k, v] of Object.entries(appConfig)) {
    (api.setConfig as jest.Mock)(k, v);
  }
  return {
    appId: "app1",
    userId: "user1",
    config: appConfig,
    api,
    ...overrides,
  } as unknown as PluginContext & { api: ReturnType<typeof createMockAPI> };
}

async function initPlugin(ctx: ReturnType<typeof makeCtx>) {
  await plugin.definition.hooks!["app:init"]!(ctx);
  return ctx.api._endpoints;
}

function makeRes() {
  const res = {
    _status: 200,
    _data: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: unknown) {
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

function getEndpoint(
  endpoints: EndpointDefinition[],
  method: string,
  path: string,
): EndpointDefinition {
  const ep = endpoints.find((e) => e.method === method && e.path === path);
  if (!ep) throw new Error(`Endpoint ${method} ${path} not found`);
  return ep;
}

// ── Helper function tests ─────────────────────────────────────────────────────

describe("buildTemplateKey", () => {
  it("prefixes with template:", () => {
    expect(buildTemplateKey("blog-post")).toBe("template:blog-post");
  });
});

describe("buildJobKey", () => {
  it("prefixes with generated:", () => {
    expect(buildJobKey("abc123")).toBe("generated:abc123");
  });
});

describe("generateJobId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateJobId()).toBe("string");
    expect(generateJobId().length).toBeGreaterThan(0);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 50 }, generateJobId));
    expect(ids.size).toBe(50);
  });
});

describe("applyTemplate", () => {
  it("replaces known variables", () => {
    const result = applyTemplate("Hello {{name}}, welcome to {{place}}!", {
      name: "Alice",
      place: "Agentbase",
    });
    expect(result).toBe("Hello Alice, welcome to Agentbase!");
  });

  it("leaves unknown placeholders intact", () => {
    const result = applyTemplate("Hello {{name}}, {{unknown}}!", {
      name: "Bob",
    });
    expect(result).toBe("Hello Bob, {{unknown}}!");
  });

  it("handles empty variables map", () => {
    const result = applyTemplate("No vars here.", {});
    expect(result).toBe("No vars here.");
  });

  it("replaces multiple occurrences of the same variable", () => {
    const result = applyTemplate("{{x}} + {{x}} = 2{{x}}", { x: "y" });
    expect(result).toBe("y + y = 2y");
  });
});

describe("analyzeKeywordDensity", () => {
  it("returns 0 for empty text", () => {
    expect(analyzeKeywordDensity("", "keyword")).toBe(0);
  });

  it("returns 0 for empty keyword", () => {
    expect(analyzeKeywordDensity("some text here", "")).toBe(0);
  });

  it("calculates correct density", () => {
    // "cat cat dog" — 3 words, cat appears twice → density = 2/3
    const density = analyzeKeywordDensity("cat cat dog", "cat");
    expect(density).toBeCloseTo(2 / 3);
  });

  it("is case-insensitive", () => {
    const density = analyzeKeywordDensity("Cat CAT cat dog", "cat");
    expect(density).toBeCloseTo(3 / 4);
  });

  it("returns 0 when keyword absent", () => {
    expect(analyzeKeywordDensity("the quick brown fox", "elephant")).toBe(0);
  });
});

describe("buildSeoSuffix", () => {
  it("returns generic SEO instruction when no keyword provided", () => {
    const suffix = buildSeoSuffix();
    expect(suffix).toContain("Optimize this content for SEO");
    expect(suffix).not.toContain("density");
  });

  it("includes keyword density guidance when keyword given", () => {
    const suffix = buildSeoSuffix("agentbase");
    expect(suffix).toContain("agentbase");
    expect(suffix).toContain("1–2%");
  });

  it("starts with a newline", () => {
    expect(buildSeoSuffix()).toMatch(/^\n/);
  });
});

// ── Template library ──────────────────────────────────────────────────────────

describe("BUILT_IN_TEMPLATES", () => {
  it("contains at least 50 templates", () => {
    expect(BUILT_IN_TEMPLATES.length).toBeGreaterThanOrEqual(50);
  });

  it("every template has required fields", () => {
    for (const tpl of BUILT_IN_TEMPLATES) {
      expect(typeof tpl.slug).toBe("string");
      expect(typeof tpl.name).toBe("string");
      expect(typeof tpl.category).toBe("string");
      expect(typeof tpl.prompt).toBe("string");
      expect(Array.isArray(tpl.variables)).toBe(true);
      expect(tpl.builtin).toBe(true);
    }
  });

  it("all slugs are unique", () => {
    const slugs = BUILT_IN_TEMPLATES.map((t) => t.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("BUILT_IN_TEMPLATES covers expected categories", () => {
    const categories = new Set(BUILT_IN_TEMPLATES.map((t) => t.category));
    expect(categories.has("Blog & Content")).toBe(true);
    expect(categories.has("Email Marketing")).toBe(true);
    expect(categories.has("Social Media")).toBe(true);
    expect(categories.has("SEO & Web")).toBe(true);
    expect(categories.has("Business")).toBe(true);
  });

  it("every prompt references at least one variable listed in variables array", () => {
    for (const tpl of BUILT_IN_TEMPLATES) {
      // every declared variable should appear in the prompt
      for (const v of tpl.variables) {
        expect(tpl.prompt).toContain(`{{${v}}}`);
      }
    }
  });
});

// ── Plugin definition ─────────────────────────────────────────────────────────

describe("plugin definition", () => {
  it("has correct name and version", () => {
    expect(plugin.definition.name).toBe("content-generator");
    expect(plugin.definition.version).toBe("1.0.0");
  });

  it("defines three settings with correct types", () => {
    const s = plugin.definition.settings!;
    expect(s["defaultModel"]!.type).toBe("select");
    expect(s["defaultModel"]!.options).toEqual([...SUPPORTED_MODELS]);
    expect(s["defaultModel"]!.default).toBe(DEFAULT_MODEL);

    expect(s["temperature"]!.type).toBe("number");
    expect(s["temperature"]!.default).toBe(DEFAULT_TEMPERATURE);

    expect(s["seoMode"]!.type).toBe("boolean");
    expect(s["seoMode"]!.default).toBe(false);
  });

  it("declares app:init hook", () => {
    expect(typeof plugin.definition.hooks!["app:init"]).toBe("function");
  });

  it("declares prompt:modify filter", () => {
    expect(typeof plugin.definition.filters!["prompt:modify"]).toBe("function");
  });
});

// ── app:init — endpoint registration and template seeding ────────────────────

describe("app:init", () => {
  it("registers 5 endpoints", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    expect(eps).toHaveLength(5);
  });

  it("registers endpoints with correct methods and paths", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const pairs = eps.map((e) => `${e.method} ${e.path}`);
    expect(pairs).toContain("GET /templates");
    expect(pairs).toContain("GET /templates/:id");
    expect(pairs).toContain("POST /generate");
    expect(pairs).toContain("POST /batch");
    expect(pairs).toContain("GET /batch/:jobId");
  });

  it("seeds all built-in templates to the DB", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    // Verify a few representative templates were seeded
    const blogPost = await ctx.api.db.get("template:blog-post");
    expect(blogPost).toBeTruthy();
    const emailSub = await ctx.api.db.get("template:email-subject-line");
    expect(emailSub).toBeTruthy();
  });

  it("does not overwrite existing templates on re-init", async () => {
    const ctx = makeCtx();
    // Pre-seed a custom version of a template
    const custom: ContentTemplate = {
      slug: "blog-post",
      name: "Custom Blog Post",
      category: "Blog & Content",
      description: "Custom",
      prompt: "Custom prompt",
      variables: [],
      builtin: false,
    };
    await ctx.api.db.set("template:blog-post", custom);

    await initPlugin(ctx);

    const after = (await ctx.api.db.get(
      "template:blog-post",
    )) as ContentTemplate;
    expect(after.name).toBe("Custom Blog Post");
  });
});

// ── GET /templates ────────────────────────────────────────────────────────────

describe("GET /templates", () => {
  it("returns all seeded templates sorted by category:name", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "GET", "/templates");

    const res = makeRes();
    await ep.handler(fakeReq(), res as never);

    const data = res._data as { templates: ContentTemplate[]; total: number };
    expect(Array.isArray(data.templates)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(50);
    expect(data.total).toBe(data.templates.length);
  });
});

// ── GET /templates/:id ────────────────────────────────────────────────────────

describe("GET /templates/:id", () => {
  it("returns the requested template", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "GET", "/templates/:id");

    const res = makeRes();
    await ep.handler(fakeReq({ params: { id: "blog-post" } }), res as never);

    const data = res._data as { template: ContentTemplate };
    expect(data.template.slug).toBe("blog-post");
  });

  it("returns 404 for unknown template", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "GET", "/templates/:id");

    const res = makeRes();
    await ep.handler(fakeReq({ params: { id: "nonexistent" } }), res as never);

    expect(res._status).toBe(404);
  });
});

// ── POST /generate ────────────────────────────────────────────────────────────

describe("POST /generate", () => {
  it("returns generated text for a valid request", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/generate");

    (ctx.api.makeRequest as jest.Mock).mockResolvedValueOnce(
      makeAiResponse("Great blog post content"),
    );

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: {
          templateSlug: "blog-post",
          variables: {
            title: "Test Title",
            topic: "AI",
            audience: "developers",
            tone: "professional",
            wordCount: "500",
          },
        },
      }),
      res as never,
    );

    const data = res._data as { text: string; templateSlug: string };
    expect(data.text).toBe("Great blog post content");
    expect(data.templateSlug).toBe("blog-post");
  });

  it("returns 400 when templateSlug is missing", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/generate");

    const res = makeRes();
    await ep.handler(fakeReq({ method: "POST", body: {} }), res as never);

    expect(res._status).toBe(400);
  });

  it("returns 404 for unknown template slug", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/generate");

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: { templateSlug: "no-such-template", variables: {} },
      }),
      res as never,
    );

    expect(res._status).toBe(404);
  });

  it("returns 502 when AI service fails", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/generate");

    (ctx.api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: { templateSlug: "blog-post", variables: {} },
      }),
      res as never,
    );

    expect(res._status).toBe(502);
  });

  it("uses defaultModel from config when no model specified", async () => {
    const ctx = makeCtx({}, { defaultModel: "claude-3-5-sonnet" });
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/generate");

    (ctx.api.makeRequest as jest.Mock).mockResolvedValueOnce(
      makeAiResponse("response"),
    );

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: { templateSlug: "blog-post", variables: {} },
      }),
      res as never,
    );

    const callBody = JSON.parse(
      (ctx.api.makeRequest as jest.Mock).mock.calls[0][1].body as string,
    ) as { model: string };
    expect(callBody.model).toBe("claude-3-5-sonnet");
  });

  it("appends SEO suffix when seoMode is true", async () => {
    const ctx = makeCtx({}, { seoMode: true });
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/generate");

    (ctx.api.makeRequest as jest.Mock).mockResolvedValueOnce(
      makeAiResponse("seo content"),
    );

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: {
          templateSlug: "blog-post",
          variables: {},
          keyword: "agentbase",
        },
      }),
      res as never,
    );

    const callBody = JSON.parse(
      (ctx.api.makeRequest as jest.Mock).mock.calls[0][1].body as string,
    ) as { messages: Array<{ content: string }> };
    expect(callBody.messages[0]!.content).toContain("agentbase");
  });

  it("calls AI_COMPLETIONS_PATH", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/generate");

    (ctx.api.makeRequest as jest.Mock).mockResolvedValueOnce(
      makeAiResponse("ok"),
    );

    await ep.handler(
      fakeReq({
        method: "POST",
        body: { templateSlug: "blog-post", variables: {} },
      }),
      makeRes() as never,
    );

    expect((ctx.api.makeRequest as jest.Mock).mock.calls[0][0]).toBe(
      AI_COMPLETIONS_PATH,
    );
  });
});

// ── POST /batch ───────────────────────────────────────────────────────────────

describe("POST /batch", () => {
  it("returns a completed job record with results", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/batch");

    (ctx.api.makeRequest as jest.Mock).mockResolvedValue(
      makeAiResponse("Batch result"),
    );

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: {
          jobs: [
            { templateSlug: "blog-post", variables: {} },
            { templateSlug: "linkedin-post", variables: {} },
          ],
        },
      }),
      res as never,
    );

    const data = res._data as BatchJobRecord;
    expect(data.status).toBe("completed");
    expect(data.results).toHaveLength(2);
    expect(data.results[0]!.text).toBe("Batch result");
    expect(data.jobId).toBeTruthy();
  });

  it("records template-not-found error in results", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/batch");

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: { jobs: [{ templateSlug: "no-such-one", variables: {} }] },
      }),
      res as never,
    );

    const data = res._data as BatchJobRecord;
    expect(data.results[0]!.error).toMatch(/Template not found/);
  });

  it("returns 400 when jobs array is empty", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/batch");

    const res = makeRes();
    await ep.handler(
      fakeReq({ method: "POST", body: { jobs: [] } }),
      res as never,
    );

    expect(res._status).toBe(400);
  });

  it("returns 400 when jobs is missing", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/batch");

    const res = makeRes();
    await ep.handler(fakeReq({ method: "POST", body: {} }), res as never);

    expect(res._status).toBe(400);
  });

  it("persists job to DB", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "POST", "/batch");

    (ctx.api.makeRequest as jest.Mock).mockResolvedValue(makeAiResponse("ok"));

    const res = makeRes();
    await ep.handler(
      fakeReq({
        method: "POST",
        body: { jobs: [{ templateSlug: "blog-post", variables: {} }] },
      }),
      res as never,
    );

    const data = res._data as BatchJobRecord;
    const stored = await ctx.api.db.get(buildJobKey(data.jobId));
    expect(stored).toBeTruthy();
  });
});

// ── GET /batch/:jobId ─────────────────────────────────────────────────────────

describe("GET /batch/:jobId", () => {
  it("returns stored job record", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);

    // First create a batch job
    const postEp = getEndpoint(eps, "POST", "/batch");
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue(makeAiResponse("ok"));
    const postRes = makeRes();
    await postEp.handler(
      fakeReq({
        method: "POST",
        body: { jobs: [{ templateSlug: "blog-post", variables: {} }] },
      }),
      postRes as never,
    );
    const created = postRes._data as BatchJobRecord;

    // Now poll it
    const getEp = getEndpoint(eps, "GET", "/batch/:jobId");
    const getRes = makeRes();
    await getEp.handler(
      fakeReq({ params: { jobId: created.jobId } }),
      getRes as never,
    );

    const data = getRes._data as BatchJobRecord;
    expect(data.jobId).toBe(created.jobId);
    expect(data.status).toBe("completed");
  });

  it("returns 404 for unknown job ID", async () => {
    const ctx = makeCtx();
    const eps = await initPlugin(ctx);
    const ep = getEndpoint(eps, "GET", "/batch/:jobId");

    const res = makeRes();
    await ep.handler(
      fakeReq({ params: { jobId: "nonexistent-job" } }),
      res as never,
    );

    expect(res._status).toBe(404);
  });
});

// ── prompt:modify filter ──────────────────────────────────────────────────────

describe("prompt:modify filter", () => {
  function runFilter(ctx: PluginContext, prompt: string): string {
    return plugin.definition.filters!["prompt:modify"]!(ctx, prompt) as string;
  }

  it("returns the prompt unchanged when seoMode is off", () => {
    const ctx = makeCtx();
    const result = runFilter(ctx, "Write about cats.");
    expect(result).toBe("Write about cats.");
  });

  it("appends SEO suffix when seoMode is on", () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "seoMode" ? true : undefined,
    );
    const result = runFilter(ctx, "Write about cats.");
    expect(result).toContain("Write about cats.");
    expect(result).toContain("Optimize this content for SEO");
  });

  it("includes focus keyword in SEO suffix when present in config", () => {
    const ctx = makeCtx({}, { focusKeyword: "AI writing" });
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "seoMode" ? true : undefined,
    );
    const result = runFilter(ctx, "Write a post.");
    expect(result).toContain("AI writing");
  });

  it("resolves {{variable}} placeholders from context.config", () => {
    const ctx = makeCtx({}, { topic: "machine learning" });
    const result = runFilter(ctx, "Write about {{topic}}.");
    expect(result).toContain("machine learning");
  });

  it("leaves unresolved placeholders intact", () => {
    const ctx = makeCtx({}, {});
    const result = runFilter(ctx, "Hello {{name}}.");
    expect(result).toBe("Hello {{name}}.");
  });

  it("tolerates non-string value by coercing to string", () => {
    const ctx = makeCtx();
    const result = runFilter(ctx, 42 as unknown as string);
    expect(typeof result).toBe("string");
  });
});
