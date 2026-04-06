/// <reference types="jest" />
/**
 * Slack Connector — Unit Tests
 *
 * Covers: DB key helpers, verifySlackSignature (replay, tampered, missing),
 * slackApiCall, postSlackMessage, askAI, stripMention, plugin manifest/settings,
 * app:init (4 endpoints), POST /connect, GET /channels, POST /webhook
 * (url_verification, dedup, bot messages, mention, DM, async reply),
 * POST /slash-command (usage, async reply, response_url).
 */
import plugin, {
  buildChannelKey,
  buildMessageKey,
  buildConnectionKey,
  verifySlackSignature,
  slackApiCall,
  postSlackMessage,
  askAI,
  stripMention,
  SLACK_API_BASE,
  AI_COMPLETIONS_PATH,
  DEFAULT_SLASH_COMMAND,
  DEFAULT_AI_MODEL,
  MAX_REQUEST_AGE_MS,
  SlackChannel,
  SlackEventPayload,
  SlackSlashCommandPayload,
  ChannelConfig,
  DedupRecord,
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
import { createHmac } from "crypto";

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

  const configStore = new Map<string, unknown>();

  return {
    _endpoints,
    getConfig: jest
      .fn()
      .mockImplementation((key: string) => configStore.get(key) ?? undefined),
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

/** Build a valid Slack HMAC-SHA256 signature header value. */
function buildSlackSig(
  secret: string,
  timestamp: string,
  body: string,
): string {
  const sigBase = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(sigBase, "utf8");
  return `v0=${hmac.digest("hex")}`;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

describe("DB key helpers", () => {
  it("buildChannelKey", () => {
    expect(buildChannelKey("C123")).toBe("channel:C123");
  });

  it("buildMessageKey", () => {
    expect(buildMessageKey("Ev123")).toBe("message:Ev123");
  });

  it("buildConnectionKey", () => {
    expect(buildConnectionKey()).toBe("connection:config");
  });
});

// ── verifySlackSignature ──────────────────────────────────────────────────────

describe("verifySlackSignature", () => {
  const SECRET = "slack_test_secret";
  const BODY = '{"type":"event_callback"}';

  function makeTimestamp(offsetMs = 0): string {
    return String(Math.floor((Date.now() + offsetMs) / 1000));
  }

  it("returns true for a valid signature", () => {
    const ts = makeTimestamp();
    const sig = buildSlackSig(SECRET, ts, BODY);
    expect(verifySlackSignature(SECRET, BODY, ts, sig)).toBe(true);
  });

  it("returns false when signature is missing", () => {
    const ts = makeTimestamp();
    expect(verifySlackSignature(SECRET, BODY, ts, undefined)).toBe(false);
  });

  it("returns false when timestamp is missing", () => {
    const ts = makeTimestamp();
    const sig = buildSlackSig(SECRET, ts, BODY);
    expect(verifySlackSignature(SECRET, BODY, undefined, sig)).toBe(false);
  });

  it("returns false when signature does not start with v0=", () => {
    const ts = makeTimestamp();
    expect(verifySlackSignature(SECRET, BODY, ts, "v1=abc123")).toBe(false);
  });

  it("returns false for a replayed request older than 5 minutes", () => {
    const oldTs = makeTimestamp(-(MAX_REQUEST_AGE_MS + 1000));
    const sig = buildSlackSig(SECRET, oldTs, BODY);
    expect(verifySlackSignature(SECRET, BODY, oldTs, sig)).toBe(false);
  });

  it("returns false for a request with a future timestamp > 5 minutes ahead", () => {
    const futureTs = makeTimestamp(MAX_REQUEST_AGE_MS + 1000);
    const sig = buildSlackSig(SECRET, futureTs, BODY);
    expect(verifySlackSignature(SECRET, BODY, futureTs, sig)).toBe(false);
  });

  it("returns false when body has been tampered with", () => {
    const ts = makeTimestamp();
    const sig = buildSlackSig(SECRET, ts, BODY);
    expect(verifySlackSignature(SECRET, '{"type":"tampered"}', ts, sig)).toBe(
      false,
    );
  });

  it("returns false when secret is wrong", () => {
    const ts = makeTimestamp();
    const sig = buildSlackSig("wrong_secret", ts, BODY);
    expect(verifySlackSignature(SECRET, BODY, ts, sig)).toBe(false);
  });

  it("accepts injectable nowMs for time-locked tests", () => {
    const tsSeconds = 1_700_000_000;
    const body = "test";
    const sig = buildSlackSig(SECRET, String(tsSeconds), body);
    const nowMs = tsSeconds * 1000; // exactly on time
    expect(
      verifySlackSignature(SECRET, body, String(tsSeconds), sig, nowMs),
    ).toBe(true);
  });
});

// ── slackApiCall ──────────────────────────────────────────────────────────────

describe("slackApiCall", () => {
  it("calls the correct Slack API URL with Bearer auth", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true, channels: [] }),
    });
    const result = await slackApiCall(
      mockMake,
      "xoxb-token",
      "conversations.list",
      { limit: 10 },
    );
    expect(result.ok).toBe(true);
    const calledUrl = (mockMake.mock.calls[0] as [string, RequestInit])[0];
    expect(calledUrl).toContain(`${SLACK_API_BASE}/conversations.list`);
    expect(calledUrl).toContain("limit=10");
    const calledOpts = (mockMake.mock.calls[0] as [string, RequestInit])[1];
    expect(
      (calledOpts?.headers as Record<string, string>)?.["Authorization"],
    ).toBe("Bearer xoxb-token");
  });

  it("throws on HTTP error", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(slackApiCall(mockMake, "token", "auth.test")).rejects.toThrow(
      "HTTP error: 503",
    );
  });

  it("throws when Slack returns ok:false", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ ok: false, error: "channel_not_found" }),
    });
    await expect(
      slackApiCall(mockMake, "token", "conversations.info"),
    ).rejects.toThrow("channel_not_found");
  });
});

// ── postSlackMessage ──────────────────────────────────────────────────────────

describe("postSlackMessage", () => {
  it("calls chat.postMessage with correct body", async () => {
    let capturedBody: string | undefined;
    const mockMake = jest
      .fn()
      .mockImplementation(async (_url: string, opts?: RequestInit) => {
        capturedBody = opts?.body as string;
        return {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ ok: true }),
        };
      });
    await postSlackMessage(mockMake, "xoxb-token", "C123", "Hello!");
    const body = JSON.parse(capturedBody ?? "{}") as Record<string, unknown>;
    expect(body["channel"]).toBe("C123");
    expect(body["text"]).toBe("Hello!");
  });

  it("throws on HTTP error", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(
      postSlackMessage(mockMake, "token", "C1", "Hello"),
    ).rejects.toThrow("HTTP error");
  });

  it("throws when Slack returns ok:false", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: false, error: "not_in_channel" }),
    });
    await expect(
      postSlackMessage(mockMake, "token", "C1", "Hi"),
    ).rejects.toThrow("not_in_channel");
  });
});

// ── askAI ─────────────────────────────────────────────────────────────────────

describe("askAI", () => {
  it("returns content from OpenAI-style response", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: "AI says hi" } }],
      }),
    });
    const result = await askAI(mockMake, "Hello");
    expect(result).toBe("AI says hi");
    expect(mockMake).toHaveBeenCalledWith(
      AI_COMPLETIONS_PATH,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns content from native agentbase response shape", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ content: "Native reply" }),
    });
    expect(await askAI(mockMake, "q")).toBe("Native reply");
  });

  it("throws on non-ok response", async () => {
    const mockMake = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(askAI(mockMake, "q")).rejects.toThrow("AI service error: 503");
  });

  it("throws on unexpected response shape", async () => {
    const mockMake = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ weird: true }),
    });
    await expect(askAI(mockMake, "q")).rejects.toThrow(
      "Unexpected AI response shape",
    );
  });

  it("passes the model parameter", async () => {
    let capturedBody: string | undefined;
    const mockMake = jest
      .fn()
      .mockImplementation(async (_u: string, opts?: RequestInit) => {
        capturedBody = opts?.body as string;
        return {
          ok: true,
          status: 200,
          json: jest
            .fn()
            .mockResolvedValue({ choices: [{ message: { content: "ok" } }] }),
        };
      });
    await askAI(mockMake, "q", "claude-3-5-sonnet");
    const body = JSON.parse(capturedBody ?? "{}") as Record<string, unknown>;
    expect(body["model"]).toBe("claude-3-5-sonnet");
  });
});

// ── stripMention ──────────────────────────────────────────────────────────────

describe("stripMention", () => {
  it("removes leading <@UXXXXXXX> mention", () => {
    expect(stripMention("<@U12345678> What is 2+2?")).toBe("What is 2+2?");
  });

  it("removes leading bot mention with extra spaces", () => {
    expect(stripMention("<@UABC>   Hello bot")).toBe("Hello bot");
  });

  it("leaves text unchanged when no mention", () => {
    expect(stripMention("Hello bot")).toBe("Hello bot");
  });

  it("returns empty string when only mention", () => {
    expect(stripMention("<@U123>")).toBe("");
  });

  it("is case-insensitive for mention characters", () => {
    expect(stripMention("<@uabc123> lower case")).toBe("lower case");
  });
});

// ── Plugin manifest / settings ────────────────────────────────────────────────

describe("plugin manifest / settings", () => {
  it("name is slack-connector", () => {
    expect(plugin.definition.name).toBe("slack-connector");
  });

  it("version is 1.0.0", () => {
    expect(plugin.definition.version).toBe("1.0.0");
  });

  it("has required settings", () => {
    const settings = plugin.definition.settings!;
    expect(settings).toHaveProperty("slackBotToken");
    expect(settings).toHaveProperty("slackSigningSecret");
    expect(settings).toHaveProperty("defaultChannel");
    expect(settings).toHaveProperty("listenForMentions");
    expect(settings).toHaveProperty("slashCommand");
    expect(settings).toHaveProperty("aiModel");
  });

  it("slackBotToken has encrypted:true", () => {
    expect(plugin.definition.settings!["slackBotToken"]?.["encrypted"]).toBe(
      true,
    );
  });

  it("slackSigningSecret has encrypted:true", () => {
    expect(
      plugin.definition.settings!["slackSigningSecret"]?.["encrypted"],
    ).toBe(true);
  });

  it("slashCommand default is /ai", () => {
    expect(plugin.definition.settings!["slashCommand"]?.default).toBe(
      DEFAULT_SLASH_COMMAND,
    );
  });
});

// ── app:init ──────────────────────────────────────────────────────────────────

describe("app:init", () => {
  it("registers exactly 4 endpoints", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    expect(ctx.api._endpoints).toHaveLength(4);
  });

  it("registers POST /connect, GET /channels, POST /webhook, POST /slash-command", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const paths = ctx.api._endpoints.map((e) => `${e.method} ${e.path}`);
    expect(paths).toContain("POST /connect");
    expect(paths).toContain("GET /channels");
    expect(paths).toContain("POST /webhook");
    expect(paths).toContain("POST /slash-command");
  });
});

// ── POST /connect ─────────────────────────────────────────────────────────────

describe("POST /connect", () => {
  it("returns 400 when botToken is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/connect");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { signingSecret: "s" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: expect.stringContaining("botToken"),
    });
  });

  it("returns 400 when signingSecret is missing", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "POST", "/connect");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { botToken: "xoxb-1" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
  });

  it("returns 400 when auth.test call fails (invalid token)", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: false, error: "invalid_auth" }),
    });
    const ep = getEndpoint(ctx.api, "POST", "/connect");
    const res = makeRes();
    await ep.handler!(
      makeReq({ body: { botToken: "xoxb-bad", signingSecret: "s" } }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain("invalid_auth");
  });

  it("saves config and returns connected:true on success", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true, user_id: "UBOT" }),
    });
    const ep = getEndpoint(ctx.api, "POST", "/connect");
    const res = makeRes();
    await ep.handler!(
      makeReq({
        body: { botToken: "xoxb-valid", signingSecret: "signing_s" },
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    expect((res._body as { connected: boolean }).connected).toBe(true);
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildConnectionKey(),
      expect.objectContaining({ botToken: "xoxb-valid" }),
    );
  });
});

// ── GET /channels ─────────────────────────────────────────────────────────────

describe("GET /channels", () => {
  it("returns 400 when bot token not configured", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    const ep = getEndpoint(ctx.api, "GET", "/channels");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(400);
  });

  it("returns channel list on success", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) =>
      k === "slackBotToken" ? "xoxb-token" : undefined,
    );
    const channels: Partial<SlackChannel>[] = [
      { id: "C1", name: "general", is_private: false, is_archived: false },
    ];
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true, channels }),
    });
    const ep = getEndpoint(ctx.api, "GET", "/channels");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect((res._body as { channels: unknown[] }).channels).toHaveLength(1);
  });

  it("returns 502 when Slack API call fails", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockReturnValue("xoxb-token");
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });
    const ep = getEndpoint(ctx.api, "GET", "/channels");
    const res = makeRes();
    await ep.handler!(makeReq(), res as unknown as EndpointResponse);
    expect(res._status).toBe(502);
  });
});

// ── POST /webhook ─────────────────────────────────────────────────────────────

describe("POST /webhook", () => {
  const SECRET = "test_signing_secret";

  function makeWebhookReq(
    body: SlackEventPayload | string,
    sigOverride?: { ts?: string; sig?: string },
  ): EndpointRequest {
    const rawBody = typeof body === "string" ? body : JSON.stringify(body);
    const ts = sigOverride?.ts ?? String(Math.floor(Date.now() / 1000));
    const sig = sigOverride?.sig ?? buildSlackSig(SECRET, ts, rawBody);
    return makeReq({
      body,
      headers: {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": sig,
      },
    });
  }

  async function setupCtx(signingSecret = SECRET): Promise<MockCtx> {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, unknown> = {
        slackSigningSecret: signingSecret,
        slackBotToken: "xoxb-token",
        listenForMentions: true,
        aiModel: DEFAULT_AI_MODEL,
      };
      return cfg[k];
    });
    return ctx;
  }

  it("returns 401 when signature is invalid", async () => {
    const ctx = await setupCtx();
    const ep = getEndpoint(ctx.api, "POST", "/webhook");
    const res = makeRes();
    const body: SlackEventPayload = { type: "event_callback" };
    await ep.handler!(
      makeWebhookReq(body, { sig: "v0=badhex" }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(401);
  });

  it("responds to url_verification challenge", async () => {
    const ctx = await setupCtx();
    const ep = getEndpoint(ctx.api, "POST", "/webhook");
    const res = makeRes();
    const body: SlackEventPayload = {
      type: "url_verification",
      challenge: "challenge_token_abc",
    };
    await ep.handler!(makeWebhookReq(body), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect((res._body as { challenge: string }).challenge).toBe(
      "challenge_token_abc",
    );
  });

  it("deduplicates events with same event_id", async () => {
    const ctx = await setupCtx();
    await ctx.api.db.set(buildMessageKey("Ev_dup_123"), {
      eventId: "Ev_dup_123",
    });
    const ep = getEndpoint(ctx.api, "POST", "/webhook");
    const res = makeRes();
    const body: SlackEventPayload = {
      type: "event_callback",
      event_id: "Ev_dup_123",
    };
    await ep.handler!(makeWebhookReq(body), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect((res._body as { deduplicated: boolean }).deduplicated).toBe(true);
  });

  it("ignores bot messages (bot_id present)", async () => {
    const ctx = await setupCtx();
    const ep = getEndpoint(ctx.api, "POST", "/webhook");
    const res = makeRes();
    const body: SlackEventPayload = {
      type: "event_callback",
      event_id: "Ev_bot",
      event: { type: "message", bot_id: "B123", text: "bot said hi" },
    };
    await ep.handler!(makeWebhookReq(body), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
    expect(ctx.api.makeRequest).not.toHaveBeenCalledWith(
      AI_COMPLETIONS_PATH,
      expect.anything(),
    );
  });

  it("handles app_mention: stores dedup, fires async AI + post (no await needed)", async () => {
    const ctx = await setupCtx();
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: "AI reply" } }],
        ok: true,
      }),
    });

    const ep = getEndpoint(ctx.api, "POST", "/webhook");
    const res = makeRes();
    const body: SlackEventPayload = {
      type: "event_callback",
      event_id: "Ev_mention_1",
      event: {
        type: "app_mention",
        text: "<@UBOT> what is AI?",
        channel: "C_GENERAL",
        user: "U_HUMAN",
      },
    };
    await ep.handler!(makeWebhookReq(body), res as unknown as EndpointResponse);

    // Immediate acknowledgment
    expect(res._status).toBe(200);
    expect((res._body as { ok: boolean }).ok).toBe(true);

    // Dedup key stored
    expect(ctx.api.db.set).toHaveBeenCalledWith(
      buildMessageKey("Ev_mention_1"),
      expect.objectContaining({ eventId: "Ev_mention_1" }),
    );
  });

  it("ignores non-mention messages when listenForMentions=true and channel is not DM", async () => {
    const ctx = await setupCtx();
    const ep = getEndpoint(ctx.api, "POST", "/webhook");
    const res = makeRes();
    const body: SlackEventPayload = {
      type: "event_callback",
      event_id: "Ev_regular",
      event: {
        type: "message",
        text: "just a regular message",
        channel: "C_PUBLIC",
        user: "U_HUMAN",
      },
    };
    await ep.handler!(makeWebhookReq(body), res as unknown as EndpointResponse);
    expect(res._status).toBe(200);
  });

  it("skips signature check when signingSecret is not configured", async () => {
    const ctx = makeCtx();
    await runInit(ctx);
    // No signingSecret configured — should pass through
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      if (k === "slackSigningSecret") return "";
      if (k === "slackBotToken") return "xoxb-token";
      if (k === "listenForMentions") return true;
      return undefined;
    });
    const ep = getEndpoint(ctx.api, "POST", "/webhook");
    const res = makeRes();
    const body: SlackEventPayload = {
      type: "url_verification",
      challenge: "abc",
    };
    // No valid signature headers — should still work because secret is empty
    await ep.handler!(
      makeReq({ body, headers: {} }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    expect((res._body as { challenge: string }).challenge).toBe("abc");
  });
});

// ── POST /slash-command ───────────────────────────────────────────────────────

describe("POST /slash-command", () => {
  const SECRET = "slash_signing_secret";

  function makeSlashReq(
    body: SlackSlashCommandPayload,
    useValidSig = true,
  ): EndpointRequest {
    const rawBody = JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = useValidSig ? buildSlackSig(SECRET, ts, rawBody) : "v0=invalid";
    return makeReq({
      body,
      headers: { "x-slack-request-timestamp": ts, "x-slack-signature": sig },
    });
  }

  async function setupCtx(): Promise<MockCtx> {
    const ctx = makeCtx();
    await runInit(ctx);
    (ctx.api.getConfig as jest.Mock).mockImplementation((k: string) => {
      const cfg: Record<string, unknown> = {
        slackSigningSecret: SECRET,
        slackBotToken: "xoxb-token",
        slashCommand: DEFAULT_SLASH_COMMAND,
        aiModel: DEFAULT_AI_MODEL,
      };
      return cfg[k];
    });
    return ctx;
  }

  it("returns 401 when signature invalid", async () => {
    const ctx = await setupCtx();
    const ep = getEndpoint(ctx.api, "POST", "/slash-command");
    const res = makeRes();
    await ep.handler!(
      makeSlashReq(
        { command: "/ai", text: "hello", user_id: "U1", channel_id: "C1" },
        false,
      ),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(401);
  });

  it("returns usage message when text is empty", async () => {
    const ctx = await setupCtx();
    const ep = getEndpoint(ctx.api, "POST", "/slash-command");
    const res = makeRes();
    await ep.handler!(
      makeSlashReq({
        command: "/ai",
        text: "",
        user_id: "U1",
        channel_id: "C1",
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    const body = res._body as { response_type: string; text: string };
    expect(body.response_type).toBe("ephemeral");
    expect(body.text).toContain("/ai");
  });

  it("returns ephemeral error for unknown command", async () => {
    const ctx = await setupCtx();
    const ep = getEndpoint(ctx.api, "POST", "/slash-command");
    const res = makeRes();
    await ep.handler!(
      makeSlashReq({
        command: "/unknown",
        text: "hello",
        user_id: "U1",
        channel_id: "C1",
      }),
      res as unknown as EndpointResponse,
    );
    expect(res._status).toBe(200);
    expect((res._body as { response_type: string }).response_type).toBe(
      "ephemeral",
    );
  });

  it("returns thinking message and fires async AI call", async () => {
    const ctx = await setupCtx();
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Smart answer" } }],
        ok: true,
      }),
    });

    const ep = getEndpoint(ctx.api, "POST", "/slash-command");
    const res = makeRes();
    await ep.handler!(
      makeSlashReq({
        command: "/ai",
        text: "What is AGI?",
        user_id: "U1",
        channel_id: "C_TEST",
      }),
      res as unknown as EndpointResponse,
    );

    expect(res._status).toBe(200);
    expect((res._body as { response_type: string }).response_type).toBe(
      "in_channel",
    );
    const bodyText = (res._body as { text: string }).text;
    expect(bodyText).toContain("Thinking");
  });

  it("uses response_url for async reply when provided", async () => {
    const ctx = await setupCtx();
    const responseUrl = "https://hooks.slack.com/commands/T1/B1/token";
    let urlPostedTo: string | undefined;
    (ctx.api.makeRequest as jest.Mock)
      .mockResolvedValueOnce({
        // AI call
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "AI reply" } }],
        }),
      })
      .mockImplementation(async (url: string) => {
        urlPostedTo = url;
        return {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ ok: true }),
        };
      });

    const ep = getEndpoint(ctx.api, "POST", "/slash-command");
    const res = makeRes();
    await ep.handler!(
      makeSlashReq({
        command: "/ai",
        text: "Tell me something",
        user_id: "U1",
        channel_id: "C1",
        response_url: responseUrl,
      }),
      res as unknown as EndpointResponse,
    );

    // Wait a tick for the fire-and-forget async work
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(urlPostedTo).toBe(responseUrl);
  });

  it("logs error and does not throw when async AI reply fails", async () => {
    const ctx = await setupCtx();
    (ctx.api.makeRequest as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const ep = getEndpoint(ctx.api, "POST", "/slash-command");
    const res = makeRes();
    await ep.handler!(
      makeSlashReq({
        command: "/ai",
        text: "fail me",
        user_id: "U1",
        channel_id: "C1",
      }),
      res as unknown as EndpointResponse,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("Slash command AI reply failed"),
      "error",
    );
  });
});
