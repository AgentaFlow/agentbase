/// <reference types="jest" />
/**
 * HubSpot CRM — Unit Tests
 *
 * Covers: DB key helpers, hubspotRequest (success + HTTP error),
 * searchContacts, getContact, getDeals (with/without pipeline filter),
 * createNote, associateNoteWithContact, updateDealStage,
 * generateEnrichmentSummary (choices shape, content shape, error),
 * plugin manifest/settings, app:init (6 endpoints),
 * POST /connect (success, missing key, invalid key),
 * GET /contacts (success, no API key, with query, with limit),
 * GET /contacts/:id (success, no API key, 404, other error),
 * POST /contacts/:id/enrich (success, no API key, missing text, with conversationId, AI error, HubSpot error),
 * GET /deals (success, no API key, pipelineId from query, pipelineId from config, limit),
 * POST /deals/:id/update-stage (success, no API key, missing stage, HubSpot error),
 * conversation:end (autoLog false, no conversationId, stores pending, logs to HubSpot when association found, no API key stores pending only).
 */
import plugin, {
  buildContactKey,
  buildEnrichmentKey,
  buildPendingKey,
  buildAssociationKey,
  hubspotRequest,
  searchContacts,
  getContact,
  getDeals,
  createNote,
  associateNoteWithContact,
  updateDealStage,
  generateEnrichmentSummary,
  HUBSPOT_API_BASE,
  AI_COMPLETIONS_PATH,
  CONNECTION_KEY,
  DEFAULT_ENRICH_MODEL,
  HubSpotContact,
  HubSpotDeal,
  HubSpotNote,
  ContactInteractionRecord,
  EnrichmentRecord,
  PendingInteractionRecord,
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
    ["hubspotApiKey", "pat-test-key"],
    ["autoLogConversations", true],
    ["enrichModel", "gpt-4o-mini"],
    ["pipelineId", ""],
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

async function initPlugin(api: MockAPI): Promise<EndpointDefinition[]> {
  const hook = plugin.definition.hooks?.["app:init"];
  await hook?.({ appId: "app-1", userId: "user-1", config: {}, api });
  return api._endpoints;
}

function getEp(
  endpoints: EndpointDefinition[],
  method: string,
  path: string,
): EndpointDefinition | undefined {
  return endpoints.find((e) => e.method === method && e.path === path);
}

// Stub a successful makeRequest returning JSON
function okJson<T>(data: T): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(""),
  });
}

// Stub a failed makeRequest
function failHttp(status: number, body = "Bad Request"): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: body,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(body),
  });
}

// ── DB Key helpers ────────────────────────────────────────────────────────────

describe("buildContactKey", () => {
  it("formats contact:hubspotId:conversationId", () => {
    expect(buildContactKey("hs-123", "conv-456")).toBe(
      "contact:hs-123:conv-456",
    );
  });

  it("handles ids with special characters", () => {
    expect(buildContactKey("a:b", "c:d")).toBe("contact:a:b:c:d");
  });
});

describe("buildEnrichmentKey", () => {
  it("formats enrichment:contactId", () => {
    expect(buildEnrichmentKey("contact-99")).toBe("enrichment:contact-99");
  });
});

describe("buildPendingKey", () => {
  it("formats pending:conversationId", () => {
    expect(buildPendingKey("conv-abc")).toBe("pending:conv-abc");
  });
});

describe("buildAssociationKey", () => {
  it("formats association:conversationId", () => {
    expect(buildAssociationKey("conv-xyz")).toBe("association:conv-xyz");
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("HUBSPOT_API_BASE is the HubSpot API root", () => {
    expect(HUBSPOT_API_BASE).toBe("https://api.hubapi.com");
  });

  it("CONNECTION_KEY is connection:config", () => {
    expect(CONNECTION_KEY).toBe("connection:config");
  });

  it("DEFAULT_ENRICH_MODEL is gpt-4o-mini", () => {
    expect(DEFAULT_ENRICH_MODEL).toBe("gpt-4o-mini");
  });

  it("AI_COMPLETIONS_PATH has the correct prefix", () => {
    expect(AI_COMPLETIONS_PATH).toMatch(/^\/api\/v1/);
  });
});

// ── hubspotRequest ────────────────────────────────────────────────────────────

describe("hubspotRequest", () => {
  it("sends GET with Authorization header", async () => {
    const mr = okJson({ results: [] });
    await hubspotRequest(mr, "my-key", "GET", "/crm/v3/objects/contacts");
    expect(mr).toHaveBeenCalledWith(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer my-key" }),
      }),
    );
  });

  it("sends POST body as JSON string", async () => {
    const mr = okJson({ id: "1", properties: {} });
    await hubspotRequest(mr, "key", "POST", "/crm/v3/objects/notes", {
      properties: { hs_note_body: "hello" },
    });
    const [, init] = (mr as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      properties: { hs_note_body: "hello" },
    });
  });

  it("sends PATCH without body when body is undefined", async () => {
    const mr = okJson({ id: "d1", properties: {} });
    await hubspotRequest(mr, "key", "GET", "/crm/v3/objects/deals/d1");
    const [, init] = (mr as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it("throws on non-2xx response", async () => {
    const mr = failHttp(401, "Unauthorized");
    await expect(
      hubspotRequest(mr, "bad-key", "GET", "/crm/v3/objects/contacts"),
    ).rejects.toThrow("HubSpot API error 401");
  });

  it("returns the parsed JSON on success", async () => {
    const payload = { id: "42", properties: { firstname: "Ada" } };
    const mr = okJson(payload);
    const result = await hubspotRequest<HubSpotContact>(
      mr,
      "key",
      "GET",
      "/crm/v3/objects/contacts/42",
    );
    expect(result.id).toBe("42");
    expect(result.properties.firstname).toBe("Ada");
  });
});

// ── searchContacts ────────────────────────────────────────────────────────────

describe("searchContacts", () => {
  it("calls POST /crm/v3/objects/contacts/search", async () => {
    const contacts: HubSpotContact[] = [
      { id: "1", properties: { email: "ada@example.com" } },
    ];
    const mr = okJson({ results: contacts, total: 1 });
    const result = await searchContacts(mr, "key", "ada", 10);
    expect(mr).toHaveBeenCalledWith(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].properties.email).toBe("ada@example.com");
  });

  it("returns empty array when results is empty", async () => {
    const mr = okJson({ results: [], total: 0 });
    const result = await searchContacts(mr, "key", "nobody", 20);
    expect(result).toEqual([]);
  });

  it("passes query and limit in POST body", async () => {
    const mr = okJson({ results: [], total: 0 });
    await searchContacts(mr, "key", "test query", 15);
    const [, init] = (mr as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.query).toBe("test query");
    expect(body.limit).toBe(15);
  });
});

// ── getContact ────────────────────────────────────────────────────────────────

describe("getContact", () => {
  it("calls GET /crm/v3/objects/contacts/:id with properties", async () => {
    const contact: HubSpotContact = {
      id: "c1",
      properties: {
        firstname: "Grace",
        lastname: "Hopper",
        email: "grace@navy.mil",
      },
    };
    const mr = okJson(contact);
    const result = await getContact(mr, "key", "c1");
    const [url] = (mr as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain("/crm/v3/objects/contacts/c1");
    expect(url).toContain("properties=");
    expect(result.properties.firstname).toBe("Grace");
  });

  it("propagates 404 errors from HubSpot", async () => {
    const mr = failHttp(404, "Not Found");
    await expect(getContact(mr, "key", "missing")).rejects.toThrow("404");
  });

  it("returns full contact properties", async () => {
    const contact: HubSpotContact = {
      id: "c2",
      properties: { company: "ENIAC Corp", phone: "555-0100" },
    };
    const mr = okJson(contact);
    const result = await getContact(mr, "key", "c2");
    expect(result.properties.company).toBe("ENIAC Corp");
  });
});

// ── getDeals ──────────────────────────────────────────────────────────────────

describe("getDeals", () => {
  const allDeals: HubSpotDeal[] = [
    {
      id: "d1",
      properties: {
        dealname: "Deal A",
        dealstage: "appointmentscheduled",
        pipeline: "pipe-1",
      },
    },
    {
      id: "d2",
      properties: {
        dealname: "Deal B",
        dealstage: "qualifiedtobuy",
        pipeline: "pipe-2",
      },
    },
  ];

  it("returns all deals when no pipelineId", async () => {
    const mr = okJson({ results: allDeals });
    const result = await getDeals(mr, "key");
    expect(result).toHaveLength(2);
  });

  it("filters deals by pipelineId", async () => {
    const mr = okJson({ results: allDeals });
    const result = await getDeals(mr, "key", "pipe-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("includes limit and properties in query string", async () => {
    const mr = okJson({ results: [] });
    await getDeals(mr, "key", undefined, 50);
    const [url] = (mr as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain("limit=50");
    expect(url).toContain("properties=");
  });

  it("returns empty array when no deals exist", async () => {
    const mr = okJson({ results: [] });
    const result = await getDeals(mr, "key");
    expect(result).toEqual([]);
  });
});

// ── createNote ────────────────────────────────────────────────────────────────

describe("createNote", () => {
  it("calls POST /crm/v3/objects/notes with note body", async () => {
    const note: HubSpotNote = {
      id: "n1",
      properties: {
        hs_note_body: "Test note",
        hs_timestamp: "2026-01-01T00:00:00.000Z",
      },
    };
    const mr = okJson(note);
    const result = await createNote(mr, "key", "Test note");
    expect(mr).toHaveBeenCalledWith(
      `${HUBSPOT_API_BASE}/crm/v3/objects/notes`,
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = (mr as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.properties.hs_note_body).toBe("Test note");
    expect(result.id).toBe("n1");
  });

  it("includes hs_timestamp in the request", async () => {
    const mr = okJson({ id: "n2", properties: {} });
    await createNote(mr, "key", "Hello");
    const [, init] = (mr as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(typeof body.properties.hs_timestamp).toBe("string");
    expect(body.properties.hs_timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("throws on HubSpot error", async () => {
    const mr = failHttp(403, "Forbidden");
    await expect(createNote(mr, "key", "body")).rejects.toThrow("403");
  });
});

// ── associateNoteWithContact ──────────────────────────────────────────────────

describe("associateNoteWithContact", () => {
  it("posts to associations batch endpoint with correct payload", async () => {
    const mr = okJson({ results: [] });
    await associateNoteWithContact(mr, "key", "note-1", "contact-1");
    const [url, init] = (mr as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/crm/v3/associations/notes/contacts/batch/create");
    const body = JSON.parse(init.body as string);
    expect(body.inputs[0].from.id).toBe("note-1");
    expect(body.inputs[0].to.id).toBe("contact-1");
    expect(body.inputs[0].type).toBe("note_to_contact");
  });

  it("throws when association POST fails", async () => {
    const mr = failHttp(400, "Bad input");
    await expect(
      associateNoteWithContact(mr, "key", "n1", "c1"),
    ).rejects.toThrow("400");
  });
});

// ── updateDealStage ───────────────────────────────────────────────────────────

describe("updateDealStage", () => {
  it("sends PATCH to /crm/v3/objects/deals/:id with stage", async () => {
    const deal: HubSpotDeal = {
      id: "d1",
      properties: { dealstage: "closedwon", pipeline: "pipe-1" },
    };
    const mr = okJson(deal);
    const result = await updateDealStage(mr, "key", "d1", "closedwon");
    const [url, init] = (mr as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/crm/v3/objects/deals/d1");
    expect((init as RequestInit).method).toBe("PATCH");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.properties.dealstage).toBe("closedwon");
    expect(result.properties.dealstage).toBe("closedwon");
  });

  it("throws on HubSpot error", async () => {
    const mr = failHttp(404, "Deal not found");
    await expect(
      updateDealStage(mr, "key", "missing", "stage"),
    ).rejects.toThrow("404");
  });
});

// ── generateEnrichmentSummary ─────────────────────────────────────────────────

describe("generateEnrichmentSummary", () => {
  it("extracts summary from choices[0].message.content", async () => {
    const mr = okJson({
      choices: [{ message: { content: "CRM summary text." } }],
    });
    const result = await generateEnrichmentSummary(
      mr,
      "User said hi.",
      "gpt-4o-mini",
    );
    expect(result).toBe("CRM summary text.");
  });

  it("falls back to top-level content field", async () => {
    const mr = okJson({ content: "Fallback summary." });
    const result = await generateEnrichmentSummary(mr, "Hello world");
    expect(result).toBe("Fallback summary.");
  });

  it("throws on unexpected AI response shape", async () => {
    const mr = okJson({ unexpected: true });
    await expect(generateEnrichmentSummary(mr, "Hello")).rejects.toThrow(
      "Unexpected AI response shape",
    );
  });

  it("throws on non-200 AI response", async () => {
    const mr = failHttp(500, "Internal Server Error");
    await expect(generateEnrichmentSummary(mr, "Hello")).rejects.toThrow(
      "AI service error: 500",
    );
  });

  it("uses DEFAULT_ENRICH_MODEL when model is omitted", async () => {
    const mr = okJson({
      choices: [{ message: { content: "summary" } }],
    });
    await generateEnrichmentSummary(mr, "text");
    const [, init] = (mr as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(DEFAULT_ENRICH_MODEL);
  });

  it("sends conversation text in the prompt", async () => {
    const mr = okJson({
      choices: [{ message: { content: "ok" } }],
    });
    await generateEnrichmentSummary(mr, "The user asked about pricing.");
    const [, init] = (mr as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const userMsg = body.messages.find(
      (m: { role: string }) => m.role === "user",
    );
    expect(userMsg?.content).toContain("The user asked about pricing.");
  });
});

// ── Plugin manifest ───────────────────────────────────────────────────────────

describe("plugin manifest", () => {
  it("has name hubspot-crm", () => {
    expect(plugin.manifest.name).toBe("hubspot-crm");
  });

  it("has version 1.0.0", () => {
    expect(plugin.manifest.version).toBe("1.0.0");
  });

  it("requires network:external and db:readwrite permissions", () => {
    expect(plugin.manifest.permissions).toContain("network:external");
    expect(plugin.manifest.permissions).toContain("db:readwrite");
  });
});

// ── Plugin settings ───────────────────────────────────────────────────────────

describe("plugin settings", () => {
  const settings = plugin.definition.settings!;

  it("has hubspotApiKey as encrypted string", () => {
    expect(settings["hubspotApiKey"].type).toBe("string");
    expect(settings["hubspotApiKey"].encrypted).toBe(true);
  });

  it("has autoLogConversations boolean defaulting to true", () => {
    expect(settings["autoLogConversations"].type).toBe("boolean");
    expect(settings["autoLogConversations"].default).toBe(true);
  });

  it("has enrichModel select with gpt-4o-mini as default", () => {
    expect(settings["enrichModel"].type).toBe("select");
    expect(settings["enrichModel"].default).toBe("gpt-4o-mini");
    expect(settings["enrichModel"].options).toContain("gpt-4o");
    expect(settings["enrichModel"].options).toContain("claude-3-5-sonnet");
  });

  it("has pipelineId string setting", () => {
    expect(settings["pipelineId"].type).toBe("string");
  });

  it("defines exactly 4 settings", () => {
    expect(Object.keys(settings)).toHaveLength(4);
  });
});

// ── app:init — endpoint registration ─────────────────────────────────────────

describe("app:init hook", () => {
  it("registers exactly 6 endpoints", async () => {
    const api = createMockAPI();
    await initPlugin(api);
    expect(api._endpoints).toHaveLength(6);
  });

  it("all endpoints require auth", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    expect(endpoints.every((e) => e.auth === true)).toBe(true);
  });

  it("registers POST /connect", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    expect(getEp(endpoints, "POST", "/connect")).toBeDefined();
  });

  it("registers GET /contacts", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    expect(getEp(endpoints, "GET", "/contacts")).toBeDefined();
  });

  it("registers GET /contacts/:id", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    expect(getEp(endpoints, "GET", "/contacts/:id")).toBeDefined();
  });

  it("registers POST /contacts/:id/enrich", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    expect(getEp(endpoints, "POST", "/contacts/:id/enrich")).toBeDefined();
  });

  it("registers GET /deals", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    expect(getEp(endpoints, "GET", "/deals")).toBeDefined();
  });

  it("registers POST /deals/:id/update-stage", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    expect(getEp(endpoints, "POST", "/deals/:id/update-stage")).toBeDefined();
  });
});

// ── POST /connect ─────────────────────────────────────────────────────────────

describe("POST /connect", () => {
  it("validates key, stores config, returns connected: true", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ results: [] }),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/connect")!;
    const req = makeReq({ body: { apiKey: "pat-live-123" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ connected: true });
    expect(api.db.set).toHaveBeenCalledWith(
      CONNECTION_KEY,
      expect.objectContaining({ apiKey: "pat-live-123" }),
    );
  });

  it("returns 400 when apiKey is missing", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/connect")!;
    const req = makeReq({ body: {} });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.stringContaining("required"),
    });
  });

  it("returns 400 when HubSpot rejects the token", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Unauthorized"),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/connect")!;
    const req = makeReq({ body: { apiKey: "bad-key" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.stringContaining("Invalid API key"),
    });
  });
});

// ── GET /contacts ─────────────────────────────────────────────────────────────

describe("GET /contacts", () => {
  it("returns contacts from HubSpot search", async () => {
    const contacts: HubSpotContact[] = [
      { id: "c1", properties: { email: "test@example.com" } },
    ];
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ results: contacts, total: 1 }),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts")!;
    const req = makeReq({ query: { q: "test" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      contacts: expect.arrayContaining([expect.objectContaining({ id: "c1" })]),
    });
  });

  it("returns 400 when API key not configured", async () => {
    const api = createMockAPI({ hubspotApiKey: "" });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts")!;
    const res = makeRes();

    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.stringContaining("not configured"),
    });
  });

  it("caps limit at 100", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts")!;
    const req = makeReq({ query: { q: "", limit: "500" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    // makeRequest is called for the search; check the body's limit field
    const allCalls = (api.makeRequest as jest.Mock).mock.calls as [
      string,
      RequestInit,
    ][];
    const searchCall = allCalls.find(([url]) =>
      url.includes("/contacts/search"),
    );
    const body = JSON.parse(searchCall![1].body as string);
    expect(body.limit).toBeLessThanOrEqual(100);
  });

  it("returns 502 on HubSpot network error", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Service Unavailable"),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts")!;
    const req = makeReq({ query: { q: "x" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(502);
  });
});

// ── GET /contacts/:id ─────────────────────────────────────────────────────────

describe("GET /contacts/:id", () => {
  it("returns a single contact", async () => {
    const contact: HubSpotContact = {
      id: "c1",
      properties: { firstname: "Alan", lastname: "Turing" },
    };
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(contact),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts/:id")!;
    const req = makeReq({ params: { id: "c1" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ contact: { id: "c1" } });
  });

  it("returns 400 when API key not configured", async () => {
    const api = createMockAPI({ hubspotApiKey: "" });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts/:id")!;
    const res = makeRes();

    await ep.handler(
      makeReq({ params: { id: "x" } }),
      res as unknown as EndpointResponse,
    );

    expect(res._status).toBe(400);
  });

  it("returns 404 when HubSpot returns 404", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Not Found"),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts/:id")!;
    const req = makeReq({ params: { id: "missing" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({ error: "Contact not found" });
  });

  it("returns 502 on other HubSpot errors", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("error"),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/contacts/:id")!;
    const req = makeReq({ params: { id: "c1" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(502);
  });
});

// ── POST /contacts/:id/enrich ─────────────────────────────────────────────────

describe("POST /contacts/:id/enrich", () => {
  async function callEnrich(
    api: MockAPI,
    params: Record<string, string>,
    body: Record<string, unknown>,
  ) {
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/contacts/:id/enrich")!;
    const req = makeReq({ params, body });
    const res = makeRes();
    await ep.handler(req, res as unknown as EndpointResponse);
    return res;
  }

  it("generates summary, creates note, stores enrichment record", async () => {
    const api = createMockAPI();
    const makeReqMock = api.makeRequest as jest.Mock;

    // Call 1: AI summary
    makeReqMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [
          { message: { content: "Contact is interested in Pro plan." } },
        ],
      }),
      text: jest.fn().mockResolvedValue(""),
    });
    // Call 2: create note
    makeReqMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "n1",
        properties: {
          hs_note_body: "Contact is interested in Pro plan.",
          hs_timestamp: "",
        },
      }),
      text: jest.fn().mockResolvedValue(""),
    });
    // Call 3: associate note
    makeReqMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: [] }),
      text: jest.fn().mockResolvedValue(""),
    });

    const res = await callEnrich(
      api,
      { id: "c1" },
      {
        conversationText: "User asked about pricing.",
        conversationId: "conv-1",
      },
    );

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      summary: "Contact is interested in Pro plan.",
      noteId: "n1",
    });
    expect(api.db.set).toHaveBeenCalledWith(
      buildEnrichmentKey("c1"),
      expect.objectContaining({ contactId: "c1", summary: expect.any(String) }),
    );
    expect(api.db.set).toHaveBeenCalledWith(
      buildContactKey("c1", "conv-1"),
      expect.objectContaining({
        hubspotContactId: "c1",
        conversationId: "conv-1",
      }),
    );
  });

  it("stores enrichment even without conversationId", async () => {
    const api = createMockAPI();
    const makeReqMock = api.makeRequest as jest.Mock;
    makeReqMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "A summary." } }],
        }),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: "n2", properties: {} }),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ results: [] }),
        text: jest.fn().mockResolvedValue(""),
      });

    const res = await callEnrich(
      api,
      { id: "c2" },
      { conversationText: "text" },
    );

    expect(res._status).toBe(200);
    // enrichment record stored, but no contact-interaction record
    expect(api.db.set).toHaveBeenCalledWith(
      buildEnrichmentKey("c2"),
      expect.objectContaining({ contactId: "c2" }),
    );
    const setCallKeys = (api.db.set as jest.Mock).mock.calls.map(
      ([k]: [string]) => k,
    );
    expect(setCallKeys.some((k: string) => k.startsWith("contact:"))).toBe(
      false,
    );
  });

  it("returns 400 when API key not configured", async () => {
    const api = createMockAPI({ hubspotApiKey: "" });
    const res = await callEnrich(
      api,
      { id: "c1" },
      { conversationText: "text" },
    );
    expect(res._status).toBe(400);
  });

  it("returns 400 when conversationText is missing", async () => {
    const api = createMockAPI();
    const res = await callEnrich(api, { id: "c1" }, {});
    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.stringContaining("required"),
    });
  });

  it("returns 502 on AI service error", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("error"),
    });
    const res = await callEnrich(
      api,
      { id: "c1" },
      { conversationText: "text" },
    );
    expect(res._status).toBe(502);
  });

  it("returns 502 on HubSpot note creation error", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "summary" } }],
        }),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue({}),
        text: jest.fn().mockResolvedValue("Forbidden"),
      });

    const res = await callEnrich(
      api,
      { id: "c1" },
      { conversationText: "text" },
    );
    expect(res._status).toBe(502);
  });
});

// ── GET /deals ────────────────────────────────────────────────────────────────

describe("GET /deals", () => {
  const deals: HubSpotDeal[] = [
    {
      id: "d1",
      properties: {
        dealname: "Enterprise",
        pipeline: "default",
        dealstage: "closedwon",
      },
    },
    {
      id: "d2",
      properties: {
        dealname: "Starter",
        pipeline: "pipe-2",
        dealstage: "appointmentscheduled",
      },
    },
  ];

  it("returns all deals when no pipeline filter", async () => {
    const api = createMockAPI({ pipelineId: "" });
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: deals }),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/deals")!;
    const res = makeRes();

    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    expect((res._body as { deals: unknown[] }).deals).toHaveLength(2);
  });

  it("filters by pipelineId in query param", async () => {
    const api = createMockAPI({ pipelineId: "" });
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: deals }),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/deals")!;
    const req = makeReq({ query: { pipelineId: "pipe-2" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect((res._body as { deals: HubSpotDeal[] }).deals).toHaveLength(1);
    expect((res._body as { deals: HubSpotDeal[] }).deals[0].id).toBe("d2");
  });

  it("uses pipelineId from plugin config when not in query", async () => {
    const api = createMockAPI({ pipelineId: "default" });
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: deals }),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/deals")!;
    const res = makeRes();

    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect((res._body as { deals: HubSpotDeal[] }).deals).toHaveLength(1);
    expect((res._body as { deals: HubSpotDeal[] }).deals[0].id).toBe("d1");
  });

  it("returns 400 when API key not configured", async () => {
    const api = createMockAPI({ hubspotApiKey: "" });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/deals")!;
    const res = makeRes();

    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(400);
  });

  it("returns 502 on HubSpot error", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Bad Gateway"),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "GET", "/deals")!;
    const res = makeRes();

    await ep.handler(makeReq(), res as unknown as EndpointResponse);

    expect(res._status).toBe(502);
  });
});

// ── POST /deals/:id/update-stage ──────────────────────────────────────────────

describe("POST /deals/:id/update-stage", () => {
  it("updates the deal stage and returns deal", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "d1",
        properties: { dealstage: "closedwon", pipeline: "default" },
      }),
      text: jest.fn().mockResolvedValue(""),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/deals/:id/update-stage")!;
    const req = makeReq({ params: { id: "d1" }, body: { stage: "closedwon" } });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(200);
    expect((res._body as { deal: HubSpotDeal }).deal.properties.dealstage).toBe(
      "closedwon",
    );
  });

  it("returns 400 when API key not configured", async () => {
    const api = createMockAPI({ hubspotApiKey: "" });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/deals/:id/update-stage")!;
    const res = makeRes();

    await ep.handler(
      makeReq({ params: { id: "d1" }, body: { stage: "closedlost" } }),
      res as unknown as EndpointResponse,
    );

    expect(res._status).toBe(400);
  });

  it("returns 400 when stage is missing", async () => {
    const api = createMockAPI();
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/deals/:id/update-stage")!;
    const req = makeReq({ params: { id: "d1" }, body: {} });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.stringContaining("required"),
    });
  });

  it("returns 502 on HubSpot error", async () => {
    const api = createMockAPI();
    (api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Not Found"),
    });
    const endpoints = await initPlugin(api);
    const ep = getEp(endpoints, "POST", "/deals/:id/update-stage")!;
    const req = makeReq({
      params: { id: "missing" },
      body: { stage: "closedwon" },
    });
    const res = makeRes();

    await ep.handler(req, res as unknown as EndpointResponse);

    expect(res._status).toBe(502);
  });
});

// ── conversation:end hook ─────────────────────────────────────────────────────

describe("conversation:end hook", () => {
  async function fireHook(ctx: MockCtx): Promise<void> {
    const hook = plugin.definition.hooks?.["conversation:end"];
    await hook?.(ctx);
  }

  it("skips everything when autoLogConversations is false", async () => {
    const ctx = makeCtx({ userId: "u1" }, { autoLogConversations: false });
    (ctx as unknown as Record<string, unknown>)["conversationId"] = "conv-1";

    await fireHook(ctx);

    expect(ctx.api.db.set).not.toHaveBeenCalled();
    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("skips when conversationId is not on context", async () => {
    const ctx = makeCtx({ userId: "u1" });
    // no conversationId set

    await fireHook(ctx);

    expect(ctx.api.db.set).not.toHaveBeenCalled();
  });

  it("stores a pending record when autoLogConversations is true", async () => {
    const ctx = makeCtx({ userId: "u1" });
    (ctx as unknown as Record<string, unknown>)["conversationId"] = "conv-2";

    await fireHook(ctx);

    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildPendingKey("conv-2"),
      expect.objectContaining({ conversationId: "conv-2", userId: "u1" }),
    );
  });

  it("only stores pending when API key is not configured", async () => {
    const ctx = makeCtx({ userId: "u1" }, { hubspotApiKey: "" });
    (ctx as unknown as Record<string, unknown>)["conversationId"] = "conv-3";

    await fireHook(ctx);

    expect(ctx.api.db.set).toHaveBeenCalledTimes(1);
    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("creates a HubSpot note when API key and contact association exist", async () => {
    const ctx = makeCtx({ userId: "u1" }, { hubspotApiKey: "pat-123" });
    (ctx as unknown as Record<string, unknown>)["conversationId"] = "conv-4";

    // Pre-seed contact association
    const db = ctx.api.db as PluginDatabaseAPI & {
      _store?: Map<string, unknown>;
    };
    await db.set(buildAssociationKey("conv-4"), { hubspotContactId: "hs-c1" });

    // makeRequest: set call happened above; now mock the two HubSpot calls
    const makeReqMock = ctx.api.makeRequest as jest.Mock;
    makeReqMock
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: "note-99", properties: {} }),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ results: [] }),
        text: jest.fn().mockResolvedValue(""),
      });

    await fireHook(ctx);

    // pending record + enrichment interaction record
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildPendingKey("conv-4"),
      expect.objectContaining({ conversationId: "conv-4" }),
    );
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildContactKey("hs-c1", "conv-4"),
      expect.objectContaining({ hubspotContactId: "hs-c1", noteId: "note-99" }),
    );
  });

  it("silently ignores HubSpot errors during note creation", async () => {
    const ctx = makeCtx({ userId: "u1" }, { hubspotApiKey: "pat-123" });
    (ctx as unknown as Record<string, unknown>)["conversationId"] = "conv-5";
    await ctx.api.db.set(buildAssociationKey("conv-5"), {
      hubspotContactId: "hs-c2",
    });

    (ctx.api.makeRequest as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Service Unavailable"),
    });

    // Should not throw
    await expect(fireHook(ctx)).resolves.toBeUndefined();
    // pending record still stored
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildPendingKey("conv-5"),
      expect.anything(),
    );
  });
});
