/// <reference types="jest" />
/**
 * Email Automation — Unit Tests
 *
 * Covers: DB key helpers, interpolate, sendViaResend, sendViaSendGrid,
 * sendEmail, generateEmailCopy, advanceDripSubscribers, SYSTEM_TEMPLATES,
 * plugin manifest/settings, app:init (all 9 endpoints + 2 crons),
 * user:register hook, and conversation:end hook.
 */
import plugin, {
  buildTemplateKey,
  buildCampaignKey,
  buildSubscriberKey,
  buildSentKey,
  interpolate,
  sendViaResend,
  sendViaSendGrid,
  sendEmail,
  generateEmailCopy,
  advanceDripSubscribers,
  SYSTEM_TEMPLATES,
  RESEND_API_URL,
  SENDGRID_API_URL,
  AI_COMPLETIONS_PATH,
  DEFAULT_PROVIDER,
  SUPPORTED_PROVIDERS,
  EmailTemplate,
  DripCampaign,
  SubscriberState,
  EmailReceipt,
} from "../src/index";
import {
  PluginContext,
  PluginAPI,
  PluginDatabaseAPI,
  PluginEventBus,
  EndpointDefinition,
  CronJobDefinition,
  EndpointRequest,
  EndpointResponse,
} from "@agentbase/plugin-sdk";

// ── Mock factory ──────────────────────────────────────────────────────────────

function createMockAPI(): PluginAPI & {
  _endpoints: EndpointDefinition[];
  _crons: CronJobDefinition[];
} {
  const store = new Map<string, unknown>();
  const _endpoints: EndpointDefinition[] = [];
  const _crons: CronJobDefinition[] = [];

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

  return {
    _endpoints,
    _crons,
    getConfig: jest
      .fn()
      .mockImplementation((key: string) => configStore.get(key) ?? undefined),
    setConfig: jest
      .fn()
      .mockImplementation(async (key: string, value: unknown) =>
        configStore.set(key, value),
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
    registerCronJob: jest
      .fn()
      .mockImplementation((def: CronJobDefinition) => _crons.push(def)),
    registerWebhook: jest.fn(),
    registerAdminPage: jest.fn(),
  } as unknown as PluginAPI & {
    _endpoints: EndpointDefinition[];
    _crons: CronJobDefinition[];
  };
}

type MockAPI = ReturnType<typeof createMockAPI>;
type MockCtx = PluginContext & { api: MockAPI };

function makeCtx(overrides: Partial<PluginContext> = {}): MockCtx {
  const api = createMockAPI();
  return { appId: "app-1", userId: "user-1", config: {}, api, ...overrides } as MockCtx;
}

interface MockRes {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  _status: number;
  _body: unknown;
}

function makeRes(): MockRes {
  const r: MockRes = {
    _status: 200,
    _body: undefined,
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
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
  it("buildTemplateKey", () => {
    expect(buildTemplateKey("welcome")).toBe("template:welcome");
    expect(buildTemplateKey("custom-tpl")).toBe("template:custom-tpl");
  });

  it("buildCampaignKey", () => {
    expect(buildCampaignKey("cmp_123")).toBe("campaign:cmp_123");
  });

  it("buildSubscriberKey", () => {
    expect(buildSubscriberKey("a@b.com", "cmp_1")).toBe(
      "subscriber:a@b.com:cmp_1",
    );
  });

  it("buildSentKey", () => {
    expect(buildSentKey("msg_abc")).toBe("sent:msg_abc");
  });
});

// ── interpolate ───────────────────────────────────────────────────────────────

describe("interpolate", () => {
  it("replaces known variables", () => {
    expect(interpolate("Hello {{name}}!", { name: "Alice" })).toBe(
      "Hello Alice!",
    );
  });

  it("leaves unknown variables unchanged", () => {
    expect(interpolate("{{unknown}}", {})).toBe("{{unknown}}");
  });

  it("replaces multiple variables", () => {
    expect(
      interpolate("{{a}} + {{b}}", { a: "1", b: "2" }),
    ).toBe("1 + 2");
  });

  it("replaces same variable multiple times", () => {
    expect(interpolate("{{x}} and {{x}}", { x: "hello" })).toBe(
      "hello and hello",
    );
  });

  it("handles empty template", () => {
    expect(interpolate("", { a: "x" })).toBe("");
  });

  it("handles template with no placeholders", () => {
    expect(interpolate("plain text", { a: "x" })).toBe("plain text");
  });
});

// ── SUPPORTED_PROVIDERS / DEFAULT_PROVIDER constants ─────────────────────────

describe("provider constants", () => {
  it("contains resend and sendgrid", () => {
    expect(SUPPORTED_PROVIDERS).toContain("resend");
    expect(SUPPORTED_PROVIDERS).toContain("sendgrid");
  });

  it("default provider is resend", () => {
    expect(DEFAULT_PROVIDER).toBe("resend");
  });
});

// ── sendViaResend ─────────────────────────────────────────────────────────────

describe("sendViaResend", () => {
  it("calls Resend API with correct headers and body", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "resend_123" }),
    });

    const receipt = await sendViaResend(
      mockMake,
      "key_abc",
      "from@example.com",
      "Test From",
      { to: "to@example.com", subject: "Hello", html: "<p>Hi</p>" },
    );

    expect(mockMake).toHaveBeenCalledWith(
      RESEND_API_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer key_abc",
        }),
      }),
    );
    expect(receipt.messageId).toBe("resend_123");
    expect(receipt.provider).toBe("resend");
    expect(receipt.to).toBe("to@example.com");
  });

  it("formats from address with name", async () => {
    let capturedBody: string | undefined;
    const mockMake = jest.fn().mockImplementation(async (_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body as string;
      return {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: "id1" }),
      };
    });

    await sendViaResend(mockMake, "k", "f@e.com", "My Name", {
      to: "t@e.com",
      subject: "S",
      html: "<p>H</p>",
    });

    const parsed = JSON.parse(capturedBody ?? "{}") as Record<string, unknown>;
    expect(parsed["from"]).toBe("My Name <f@e.com>");
  });

  it("formats from address without name", async () => {
    let capturedBody: string | undefined;
    const mockMake = jest.fn().mockImplementation(async (_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body as string;
      return {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ id: "id2" }),
      };
    });

    await sendViaResend(mockMake, "k", "f@e.com", "", {
      to: "t@e.com",
      subject: "S",
      html: "<p>H</p>",
    });

    const parsed = JSON.parse(capturedBody ?? "{}") as Record<string, unknown>;
    expect(parsed["from"]).toBe("f@e.com");
  });

  it("throws on non-ok response", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: false, status: 422 });
    await expect(
      sendViaResend(mockMake, "k", "f@e.com", "", {
        to: "t@e.com",
        subject: "S",
        html: "<p>H</p>",
      }),
    ).rejects.toThrow("Resend API error: 422");
  });
});

// ── sendViaSendGrid ───────────────────────────────────────────────────────────

describe("sendViaSendGrid", () => {
  it("calls SendGrid API with correct structure", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: true, status: 202 });

    const receipt = await sendViaSendGrid(
      mockMake,
      "sg_key",
      "from@example.com",
      "SG From",
      { to: "to@sg.com", subject: "Greet", html: "<p>Hello</p>" },
    );

    expect(mockMake).toHaveBeenCalledWith(
      SENDGRID_API_URL,
      expect.objectContaining({ method: "POST" }),
    );
    expect(receipt.provider).toBe("sendgrid");
    expect(receipt.to).toBe("to@sg.com");
    expect(receipt.messageId).toMatch(/^sg_/);
  });

  it("throws on non-ok response", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(
      sendViaSendGrid(mockMake, "k", "f@e.com", "", {
        to: "t@e.com",
        subject: "S",
        html: "<p>H</p>",
      }),
    ).rejects.toThrow("SendGrid API error: 403");
  });
});

// ── sendEmail ─────────────────────────────────────────────────────────────────

describe("sendEmail", () => {
  it("routes to Resend when provider=resend", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "r1" }),
    });
    const receipt = await sendEmail(
      { provider: "resend", apiKey: "key", fromAddress: "f@e.com", fromName: "" },
      mockMake,
      { to: "t@e.com", subject: "S", html: "<p>H</p>" },
    );
    expect(receipt.provider).toBe("resend");
    expect(mockMake).toHaveBeenCalledWith(RESEND_API_URL, expect.anything());
  });

  it("routes to SendGrid when provider=sendgrid", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: true, status: 202 });
    const receipt = await sendEmail(
      { provider: "sendgrid", apiKey: "sgkey", fromAddress: "f@e.com", fromName: "" },
      mockMake,
      { to: "t@e.com", subject: "S", html: "<p>H</p>" },
    );
    expect(receipt.provider).toBe("sendgrid");
    expect(mockMake).toHaveBeenCalledWith(SENDGRID_API_URL, expect.anything());
  });

  it("defaults to Resend when provider is missing", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "r2" }),
    });
    const receipt = await sendEmail(
      { apiKey: "key", fromAddress: "f@e.com" },
      mockMake,
      { to: "t@e.com", subject: "S", html: "<p>H</p>" },
    );
    expect(receipt.provider).toBe("resend");
  });

  it("throws when apiKey is missing", async () => {
    const mockMake = jest.fn();
    await expect(
      sendEmail({ fromAddress: "f@e.com" }, mockMake, {
        to: "t@e.com",
        subject: "S",
        html: "<p>H</p>",
      }),
    ).rejects.toThrow("API key is not configured");
  });

  it("throws when fromAddress is missing", async () => {
    const mockMake = jest.fn();
    await expect(
      sendEmail({ apiKey: "key" }, mockMake, {
        to: "t@e.com",
        subject: "S",
        html: "<p>H</p>",
      }),
    ).rejects.toThrow("fromAddress is not configured");
  });
});

// ── generateEmailCopy ─────────────────────────────────────────────────────────

describe("generateEmailCopy", () => {
  it("returns content from OpenAI-style response", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({
          choices: [{ message: { content: "<p>Generated copy</p>" } }],
        }),
    });
    const result = await generateEmailCopy(mockMake, "Write a welcome email");
    expect(result).toBe("<p>Generated copy</p>");
    expect(mockMake).toHaveBeenCalledWith(
      AI_COMPLETIONS_PATH,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns content from native agentbase response shape", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ content: "<p>Native copy</p>" }),
    });
    const result = await generateEmailCopy(mockMake, "prompt");
    expect(result).toBe("<p>Native copy</p>");
  });

  it("throws on non-ok response", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(generateEmailCopy(mockMake, "p")).rejects.toThrow(
      "AI service error: 503",
    );
  });

  it("throws on unexpected response shape", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ weird: true }),
    });
    await expect(generateEmailCopy(mockMake, "p")).rejects.toThrow(
      "Unexpected AI response shape",
    );
  });

  it("passes the model parameter to the AI service", async () => {
    let capturedBody: string | undefined;
    const mockMake = jest.fn().mockImplementation(async (_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body as string;
      return {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: "ok" } }] }),
      };
    });
    await generateEmailCopy(mockMake, "prompt", "claude-3-5-sonnet");
    const body = JSON.parse(capturedBody ?? "{}") as Record<string, unknown>;
    expect(body["model"]).toBe("claude-3-5-sonnet");
  });
});

// ── SYSTEM_TEMPLATES ──────────────────────────────────────────────────────────

describe("SYSTEM_TEMPLATES", () => {
  it("contains welcome and conversation-summary", () => {
    const slugs = SYSTEM_TEMPLATES.map((t) => t.slug);
    expect(slugs).toContain("welcome");
    expect(slugs).toContain("conversation-summary");
  });

  it("all system templates have isSystem=true", () => {
    expect(SYSTEM_TEMPLATES.every((t) => t.isSystem)).toBe(true);
  });

  it("welcome template has required variables", () => {
    const welcome = SYSTEM_TEMPLATES.find((t) => t.slug === "welcome")!;
    expect(welcome.variables).toContain("appName");
    expect(welcome.variables).toContain("userName");
  });
});

// ── Plugin manifest ───────────────────────────────────────────────────────────

describe("plugin manifest / settings", () => {
  it("name is email-automation", () => {
    expect((plugin.definition as unknown as Record<string, unknown>)["name"]).toBe(
      "email-automation",
    );
  });

  it("version is 1.0.0", () => {
    expect((plugin.definition as unknown as Record<string, unknown>)["version"]).toBe(
      "1.0.0",
    );
  });

  it("has required settings: provider, apiKey, fromAddress, fromName, sendSummaryOnEnd", () => {
    const settings = plugin.definition.settings as Record<string, unknown>;
    expect(settings).toHaveProperty("provider");
    expect(settings).toHaveProperty("apiKey");
    expect(settings).toHaveProperty("fromAddress");
    expect(settings).toHaveProperty("fromName");
    expect(settings).toHaveProperty("sendSummaryOnEnd");
  });

  it("apiKey setting has encrypted:true", () => {
    const settings = plugin.definition.settings as Record<string, Record<string, unknown>>;
    expect(settings["apiKey"]?.["encrypted"]).toBe(true);
  });

  it("provider setting has options resend and sendgrid", () => {
    const settings = plugin.definition.settings as Record<string, Record<string, unknown>>;
    expect(settings["provider"]?.["options"]).toEqual(
      expect.arrayContaining(["resend", "sendgrid"]),
    );
  });
});

// ── app:init hook ─────────────────────────────────────────────────────────────

describe("app:init — seed and registration", () => {
  it("seeds system templates into plugin DB", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    for (const tpl of SYSTEM_TEMPLATES) {
      expect(ctx.api.db.set).toHaveBeenCalledWith(
        buildTemplateKey(tpl.slug),
        expect.objectContaining({ slug: tpl.slug }),
      );
    }
  });

  it("does not overwrite existing templates", async () => {
    const ctx = makeCtx();
    // Pre-seed so existing returns truthy
    await ctx.api.db.set(buildTemplateKey("welcome"), { existing: true });
    (ctx.api.db.set as jest.Mock).mockClear();

    await runInit(ctx);

    const welcomeSetCalls = (ctx.api.db.set as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === buildTemplateKey("welcome"),
    );
    expect(welcomeSetCalls.length).toBe(0);
  });

  it("registers 9 endpoints", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(ctx.api._endpoints.length).toBe(9);
  });

  it("registers 2 cron jobs", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(ctx.api._crons.length).toBe(2);
    const schedules = ctx.api._crons.map((c) => c.schedule);
    expect(schedules).toContain("0 * * * *");
    expect(schedules).toContain("0 8 * * *");
  });
});

// ── POST /send ────────────────────────────────────────────────────────────────

describe("POST /send", () => {
  async function setup() {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/send");
    return { ctx, ep };
  }

  it("returns 400 when `to` is missing", async () => {
    const { ep } = await setup();
    const res = makeRes();
    await ep.handler!(makeReq({ body: { subject: "S", html: "<p>H</p>" } }), res as unknown as EndpointResponse);
    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining("to") });
  });

  it("returns 400 when subject and html are both missing (no templateSlug)", async () => {
    const { ep } = await setup();
    const res = makeRes();
    await ep.handler!(makeReq({ body: { to: "a@b.com" } }), res as unknown as EndpointResponse);
    expect(res._status).toBe(400);
  });

  it("renders template and sends email", async () => {
    const ctx = makeCtx();
    await runInit(ctx);

    // Store a template
    const tpl: EmailTemplate = {
      slug: "promo",
      name: "Promo",
      subject: "Hi {{name}}",
      body: "<p>Dear {{name}}</p>",
      variables: ["name"],
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildTemplateKey("promo"), tpl);

    // Configure provider
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, string> = {
        provider: "resend",
        apiKey: "key",
        fromAddress: "f@e.com",
        fromName: "",
      };
      return cfg[k];
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "msg_sent" }),
    });

    const ep = getEndpoint(ctx.api, "POST", "/send");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { to: "u@b.com", templateSlug: "promo", vars: { name: "Bob" } } }),
      res as unknown as EndpointResponse,
    );

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ success: true, messageId: "msg_sent" });
  });

  it("returns 404 when templateSlug not found", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/send");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { to: "u@b.com", templateSlug: "nonexistent" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(404);
  });

  it("returns 500 on provider error", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation(() => "x");
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });
    const ep = getEndpoint(ctx.api, "POST", "/send");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { to: "u@b.com", subject: "S", html: "<p>H</p>" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(500);
  });
});

// ── GET /templates ────────────────────────────────────────────────────────────

describe("GET /templates", () => {
  it("returns all templates", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/templates");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    const body = res._body as { templates: EmailTemplate[] };
    expect(Array.isArray(body.templates)).toBe(true);
    expect(body.templates.length).toBeGreaterThanOrEqual(SYSTEM_TEMPLATES.length);
  });
});

// ── POST /templates ───────────────────────────────────────────────────────────

describe("POST /templates", () => {
  it("creates a new template", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/templates");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: {
          slug: "my-tpl",
          name: "My Template",
          subject: "Greet {{name}}",
          body: "<p>Hello {{name}}</p>",
          variables: ["name"],
        },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
    const body = res._body as { template: EmailTemplate };
    expect(body.template.slug).toBe("my-tpl");
    expect(body.template.isSystem).toBe(false);
  });

  it("returns 400 when required fields are missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/templates");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { slug: "x" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 409 when slug already exists", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    // system "welcome" already seeded
    const ep = getEndpoint(ctx.api, "POST", "/templates");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: {
          slug: "welcome",
          name: "Dup",
          subject: "S",
          body: "<p>B</p>",
        },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(409);
  });
});

// ── PUT /templates/:id ────────────────────────────────────────────────────────

describe("PUT /templates/:id", () => {
  it("updates a custom template", async () => {
    const ctx = makeCtx();
    await runInit(ctx);

    // Create a custom template first
    const tpl: EmailTemplate = {
      slug: "editable",
      name: "Old Name",
      subject: "Old Subject",
      body: "<p>Old</p>",
      variables: [],
      isSystem: false,
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildTemplateKey("editable"), tpl);

    const ep = getEndpoint(ctx.api, "PUT", "/templates/:id");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "editable" }, body: { name: "New Name" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    const body = res._body as { template: EmailTemplate };
    expect(body.template.name).toBe("New Name");
  });

  it("returns 404 for unknown template", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "PUT", "/templates/:id");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "ghost" }, body: {} }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(404);
  });

  it("returns 403 when trying to modify a system template", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "PUT", "/templates/:id");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "welcome" }, body: { name: "Hacked" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(403);
  });
});

// ── POST /campaign ────────────────────────────────────────────────────────────

describe("POST /campaign", () => {
  it("creates a campaign", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/campaign");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: {
          name: "Onboarding",
          steps: [{ delayHours: 0, templateSlug: "welcome" }],
        },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
    const body = res._body as { campaign: DripCampaign };
    expect(body.campaign.name).toBe("Onboarding");
    expect(body.campaign.active).toBe(true);
    expect(body.campaign.campaignId).toMatch(/^cmp_/);
  });

  it("returns 400 when name is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/campaign");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { steps: [{ delayHours: 0, templateSlug: "welcome" }] } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 400 when steps is empty", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/campaign");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { name: "Empty", steps: [] } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });
});

// ── GET /campaigns ────────────────────────────────────────────────────────────

describe("GET /campaigns", () => {
  it("returns list of campaigns", async () => {
    const ctx = makeCtx();
    await runInit(ctx);

    const campaign: DripCampaign = {
      campaignId: "cmp_test",
      name: "Test",
      steps: [],
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildCampaignKey("cmp_test"), campaign);

    const ep = getEndpoint(ctx.api, "GET", "/campaigns");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    const body = res._body as { campaigns: DripCampaign[] };
    expect(body.campaigns.some((c) => c.campaignId === "cmp_test")).toBe(true);
  });
});

// ── GET /campaigns/:id/stats ──────────────────────────────────────────────────

describe("GET /campaigns/:id/stats", () => {
  it("returns stats for a valid campaign", async () => {
    const ctx = makeCtx();
    await runInit(ctx);

    const campaign: DripCampaign = {
      campaignId: "cmp_stat",
      name: "Stats Campaign",
      steps: [{ delayHours: 1, templateSlug: "welcome" }],
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildCampaignKey("cmp_stat"), campaign);

    // Add one subscriber
    const sub: SubscriberState = {
      campaignId: "cmp_stat",
      email: "u@e.com",
      currentStep: 0,
      nextSendAt: Date.now() + 3_600_000,
      joinedAt: Date.now(),
      completed: false,
    };
    await ctx.api.db.set(buildSubscriberKey("u@e.com", "cmp_stat"), sub);

    const ep = getEndpoint(ctx.api, "GET", "/campaigns/:id/stats");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "cmp_stat" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    const body = res._body as {
      totalSubscribers: number;
      activeSubscribers: number;
      completedSubscribers: number;
    };
    expect(body.totalSubscribers).toBe(1);
    expect(body.activeSubscribers).toBe(1);
    expect(body.completedSubscribers).toBe(0);
  });

  it("returns 404 for unknown campaign", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/campaigns/:id/stats");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "ghost" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(404);
  });
});

// ── POST /campaign/:id/subscribe ──────────────────────────────────────────────

describe("POST /campaign/:id/subscribe", () => {
  it("subscribes an email to a campaign", async () => {
    const ctx = makeCtx();
    await runInit(ctx);

    const campaign: DripCampaign = {
      campaignId: "cmp_sub",
      name: "Sub Campaign",
      steps: [{ delayHours: 24, templateSlug: "welcome" }],
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildCampaignKey("cmp_sub"), campaign);

    const ep = getEndpoint(ctx.api, "POST", "/campaign/:id/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "cmp_sub" }, body: { email: "new@user.com" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(201);
    const body = res._body as { subscribed: boolean; nextSendAt: number };
    expect(body.subscribed).toBe(true);
    expect(body.nextSendAt).toBeGreaterThan(Date.now());
  });

  it("returns 400 when email is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/campaign/:id/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "x" }, body: {} }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 404 when campaign not found", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/campaign/:id/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "ghost" }, body: { email: "a@b.com" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(404);
  });

  it("returns 409 when email already subscribed", async () => {
    const ctx = makeCtx();
    await runInit(ctx);

    const campaign: DripCampaign = {
      campaignId: "cmp_dup",
      name: "Dup",
      steps: [{ delayHours: 1, templateSlug: "welcome" }],
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildCampaignKey("cmp_dup"), campaign);
    await ctx.api.db.set(buildSubscriberKey("dup@e.com", "cmp_dup"), { existing: true });

    const ep = getEndpoint(ctx.api, "POST", "/campaign/:id/subscribe");
    const res = makeRes();
    await ep.handler!(
      makeReq({ params: { id: "cmp_dup" }, body: { email: "dup@e.com" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(409);
  });
});

// ── POST /generate ────────────────────────────────────────────────────────────

describe("POST /generate", () => {
  it("returns generated content", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ choices: [{ message: { content: "<p>Generated</p>" } }] }),
    });
    const ep = getEndpoint(ctx.api, "POST", "/generate");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { prompt: "Write a sale email" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    expect((res._body as { content: string }).content).toContain("Generated");
  });

  it("returns 400 when prompt is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/generate");
    const res = makeRes();
    await ep.handler!(makeReq({ body: {} }), res as unknown as EndpointResponse);
    expect(res._status).toBe(400);
  });

  it("returns 500 on AI error", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({ ok: false, status: 502 });
    const ep = getEndpoint(ctx.api, "POST", "/generate");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { prompt: "test" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(500);
  });
});

// ── advanceDripSubscribers cron ───────────────────────────────────────────────

describe("advanceDripSubscribers", () => {
  function buildCampaign(id: string): DripCampaign {
    return {
      campaignId: id,
      name: "Test Campaign",
      steps: [
        { delayHours: 0, templateSlug: "step1-tpl" },
        { delayHours: 24, templateSlug: "step2-tpl" },
      ],
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
  }

  function buildTemplate(slug: string): EmailTemplate {
    return {
      slug,
      name: slug,
      subject: "Step Email",
      body: "<p>Hello {{email}}</p>",
      variables: ["email"],
      createdAt: 1,
      updatedAt: 1,
    };
  }

  it("sends email for due subscriber and advances step", async () => {
    const ctx = makeCtx();
    const campaign = buildCampaign("cmp_adv");
    await ctx.api.db.set(buildCampaignKey("cmp_adv"), campaign);
    await ctx.api.db.set(buildTemplateKey("step1-tpl"), buildTemplate("step1-tpl"));
    await ctx.api.db.set(buildTemplateKey("step2-tpl"), buildTemplate("step2-tpl"));

    const sub: SubscriberState = {
      campaignId: "cmp_adv",
      email: "user@test.com",
      currentStep: 0,
      nextSendAt: Date.now() - 1000, // due
      joinedAt: Date.now() - 3_600_000,
      completed: false,
    };
    await ctx.api.db.set(buildSubscriberKey("user@test.com", "cmp_adv"), sub);

    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, string> = {
        provider: "resend",
        apiKey: "key",
        fromAddress: "f@e.com",
        fromName: "",
      };
      return cfg[k];
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "drip_msg_1" }),
    });

    const sent = await advanceDripSubscribers(ctx);
    expect(sent).toBe(1);

    // Subscriber should have advanced to step 1
    const updated = (await ctx.api.db.get(
      buildSubscriberKey("user@test.com", "cmp_adv"),
    )) as SubscriberState;
    expect(updated.currentStep).toBe(1);
    expect(updated.completed).toBe(false);
    expect(updated.lastSentAt).toBeDefined();
  });

  it("skips subscriber whose nextSendAt is in the future", async () => {
    const ctx = makeCtx();
    const campaign = buildCampaign("cmp_skip");
    await ctx.api.db.set(buildCampaignKey("cmp_skip"), campaign);
    await ctx.api.db.set(buildTemplateKey("step1-tpl"), buildTemplate("step1-tpl"));

    const sub: SubscriberState = {
      campaignId: "cmp_skip",
      email: "future@e.com",
      currentStep: 0,
      nextSendAt: Date.now() + 999_999, // not due yet
      joinedAt: Date.now(),
      completed: false,
    };
    await ctx.api.db.set(buildSubscriberKey("future@e.com", "cmp_skip"), sub);

    const sent = await advanceDripSubscribers(ctx);
    expect(sent).toBe(0);
  });

  it("marks subscriber complete when no more steps", async () => {
    const ctx = makeCtx();
    const singleStepCampaign: DripCampaign = {
      campaignId: "cmp_done",
      name: "Single Step",
      steps: [{ delayHours: 0, templateSlug: "step1-tpl" }],
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildCampaignKey("cmp_done"), singleStepCampaign);
    await ctx.api.db.set(buildTemplateKey("step1-tpl"), buildTemplate("step1-tpl"));

    const sub: SubscriberState = {
      campaignId: "cmp_done",
      email: "done@e.com",
      currentStep: 0,
      nextSendAt: Date.now() - 1000,
      joinedAt: Date.now() - 3_600_000,
      completed: false,
    };
    await ctx.api.db.set(buildSubscriberKey("done@e.com", "cmp_done"), sub);

    (ctx.api.getConfig as jest.Mock).mockReturnValue("key");
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, string> = {
        provider: "resend",
        apiKey: "key",
        fromAddress: "f@e.com",
        fromName: "",
      };
      return cfg[k];
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "final_msg" }),
    });

    await advanceDripSubscribers(ctx);

    const updated = (await ctx.api.db.get(
      buildSubscriberKey("done@e.com", "cmp_done"),
    )) as SubscriberState;
    expect(updated.completed).toBe(true);
  });

  it("skips already completed subscribers", async () => {
    const ctx = makeCtx();
    const sub: SubscriberState = {
      campaignId: "cmp_fin",
      email: "fin@e.com",
      currentStep: 2,
      nextSendAt: Date.now() - 1000,
      joinedAt: Date.now() - 10_000,
      completed: true,
    };
    await ctx.api.db.set(buildSubscriberKey("fin@e.com", "cmp_fin"), sub);

    const sent = await advanceDripSubscribers(ctx);
    expect(sent).toBe(0);
    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("skips inactive campaigns", async () => {
    const ctx = makeCtx();
    const campaign: DripCampaign = {
      campaignId: "cmp_inactive",
      name: "Paused",
      steps: [{ delayHours: 0, templateSlug: "step1-tpl" }],
      active: false,
      createdAt: 1,
      updatedAt: 1,
    };
    await ctx.api.db.set(buildCampaignKey("cmp_inactive"), campaign);

    const sub: SubscriberState = {
      campaignId: "cmp_inactive",
      email: "p@e.com",
      currentStep: 0,
      nextSendAt: Date.now() - 1000,
      joinedAt: Date.now(),
      completed: false,
    };
    await ctx.api.db.set(buildSubscriberKey("p@e.com", "cmp_inactive"), sub);

    const sent = await advanceDripSubscribers(ctx);
    expect(sent).toBe(0);
  });

  it("logs error and continues when send fails", async () => {
    const ctx = makeCtx();
    const campaign = buildCampaign("cmp_err");
    await ctx.api.db.set(buildCampaignKey("cmp_err"), campaign);
    await ctx.api.db.set(buildTemplateKey("step1-tpl"), buildTemplate("step1-tpl"));

    const sub: SubscriberState = {
      campaignId: "cmp_err",
      email: "err@e.com",
      currentStep: 0,
      nextSendAt: Date.now() - 1000,
      joinedAt: Date.now() - 3_600_000,
      completed: false,
    };
    await ctx.api.db.set(buildSubscriberKey("err@e.com", "cmp_err"), sub);

    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, string> = {
        provider: "resend",
        apiKey: "key",
        fromAddress: "f@e.com",
        fromName: "",
      };
      return cfg[k];
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const sent = await advanceDripSubscribers(ctx);
    expect(sent).toBe(0);
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("err@e.com"),
      "error",
    );
  });
});

// ── user:register hook ────────────────────────────────────────────────────────

describe("user:register hook", () => {
  it("sends welcome email when apiKey and fromAddress are configured", async () => {
    const ctx = makeCtx();
    // Seed welcome template
    await ctx.api.db.set(buildTemplateKey("welcome"), SYSTEM_TEMPLATES[0]!);

    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, unknown> = {
        provider: "resend",
        apiKey: "key",
        fromAddress: "f@e.com",
        fromName: "App",
        appName: "TestApp",
      };
      return cfg[k];
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "welcome_msg" }),
    });

    const hook = plugin.definition.hooks?.["user:register"];
    expect(hook).toBeDefined();
    await hook!(ctx, { id: "u1", email: "new@user.com", name: "Alice" });

    expect(ctx.api.makeRequest).toHaveBeenCalled();
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildSentKey("welcome_msg"),
      expect.any(Object),
    );
  });

  it("skips when apiKey is missing", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockReturnValue(undefined);

    const hook = plugin.definition.hooks?.["user:register"];
    await hook!(ctx, { email: "u@e.com" });

    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("skips when user email is missing", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockReturnValue("value");

    const hook = plugin.definition.hooks?.["user:register"];
    await hook!(ctx, {});

    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("on send failure, logs error but does not throw", async () => {
    const ctx = makeCtx();
    await ctx.api.db.set(buildTemplateKey("welcome"), SYSTEM_TEMPLATES[0]!);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      return k === "apiKey" ? "key" : k === "fromAddress" ? "f@e.com" : undefined;
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const hook = plugin.definition.hooks?.["user:register"];
    await expect(hook!(ctx, { email: "u@e.com" })).resolves.toBeUndefined();
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("Welcome email failed"),
      "error",
    );
  });
});

// ── conversation:end hook ─────────────────────────────────────────────────────

describe("conversation:end hook", () => {
  it("sends summary email when sendSummaryOnEnd=true and email provided", async () => {
    const ctx = makeCtx();
    await ctx.api.db.set(
      buildTemplateKey("conversation-summary"),
      SYSTEM_TEMPLATES[1]!,
    );
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, unknown> = {
        sendSummaryOnEnd: true,
        provider: "resend",
        apiKey: "key",
        fromAddress: "f@e.com",
        fromName: "",
      };
      return cfg[k];
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "summary_msg" }),
    });

    const hook = plugin.definition.hooks?.["conversation:end"];
    expect(hook).toBeDefined();
    await hook!(ctx, {
      id: "conv1",
      email: "user@e.com",
      summary: "We discussed AI topics",
      duration: 120,
    });

    expect(ctx.api.makeRequest).toHaveBeenCalled();
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildSentKey("summary_msg"),
      expect.any(Object),
    );
  });

  it("skips when sendSummaryOnEnd=false", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "sendSummaryOnEnd" ? false : "value",
    );

    const hook = plugin.definition.hooks?.["conversation:end"];
    await hook!(ctx, { email: "u@e.com" });

    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("skips when conversation email is not provided", async () => {
    const ctx = makeCtx();
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "sendSummaryOnEnd" ? true : "value",
    );

    const hook = plugin.definition.hooks?.["conversation:end"];
    await hook!(ctx, {});

    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("logs error on send failure without throwing", async () => {
    const ctx = makeCtx();
    await ctx.api.db.set(
      buildTemplateKey("conversation-summary"),
      SYSTEM_TEMPLATES[1]!,
    );
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, unknown> = {
        sendSummaryOnEnd: true,
        apiKey: "key",
        fromAddress: "f@e.com",
      };
      return cfg[k];
    });
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const hook = plugin.definition.hooks?.["conversation:end"];
    await expect(
      hook!(ctx, { email: "u@e.com", summary: "test" }),
    ).resolves.toBeUndefined();
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("summary email failed"),
      "error",
    );
  });
});

