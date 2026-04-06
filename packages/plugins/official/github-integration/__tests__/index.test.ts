/// <reference types="jest" />
/**
 * GitHub Integration — Unit Tests
 *
 * Covers: DB key helpers, signature verification, prompt builders, callAI,
 * plugin manifest/settings, and all six endpoint handlers (including caching,
 * force-refresh, webhook event handling, and error paths).
 */
import plugin, {
  buildRepoKey,
  buildSummaryKey,
  buildTokenKey,
  buildWebhookLogKey,
  verifyGitHubSignature,
  buildPrSummaryPrompt,
  buildReleaseNotesPrompt,
  callAI,
  GITHUB_API_BASE,
  AI_COMPLETIONS_PATH,
  DEFAULT_MODEL,
  SUPPORTED_MODELS,
  HANDLED_EVENTS,
  GitHubPR,
  GitHubFile,
  GitHubCommit,
  PRSummaryRecord,
  WebhookEventRecord,
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

  return {
    _endpoints,
    getConfig: jest.fn().mockReturnValue(undefined),
    setConfig: jest.fn().mockResolvedValue(undefined),
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

type MockCtx = PluginContext & { api: ReturnType<typeof createMockAPI> };

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
  r.send.mockImplementation((body: unknown) => {
    r._body = body;
  });
  return r;
}

function makeReq(overrides: Partial<EndpointRequest> = {}): EndpointRequest {
  return {
    method: "POST",
    path: "/",
    params: {},
    query: {},
    body: {},
    headers: {},
    user: { id: "user-1", email: "test@example.com", role: "user" },
    ...overrides,
  };
}

function getEndpoint(
  ctx: MockCtx,
  method: string,
  path: string,
): EndpointDefinition {
  const ep = ctx.api._endpoints.find(
    (e) => e.method === method && e.path === path,
  );
  if (!ep) throw new Error(`Endpoint ${method} ${path} not found`);
  return ep;
}

async function initPlugin(ctx: MockCtx): Promise<void> {
  await plugin.definition.hooks?.["app:init"]?.(ctx);
}

// Convenience: build a valid GitHub HMAC-SHA256 signature
function makeValidSig(secret: string, body: string): string {
  return (
    "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex")
  );
}

// ── DB key helpers ────────────────────────────────────────────────────────────

describe("DB key helpers", () => {
  it("buildRepoKey formats owner/repo correctly", () => {
    expect(buildRepoKey("octocat", "Hello-World")).toBe(
      "repo:octocat/Hello-World",
    );
  });

  it("buildSummaryKey includes owner, repo, and PR number", () => {
    expect(buildSummaryKey("octocat", "Hello-World", 42)).toBe(
      "summary:octocat/Hello-World:42",
    );
  });

  it("buildTokenKey returns a fixed constant", () => {
    expect(buildTokenKey()).toBe("connected:token");
  });

  it("buildWebhookLogKey prefixes id with 'webhook:'", () => {
    expect(buildWebhookLogKey("delivery-abc")).toBe("webhook:delivery-abc");
  });
});

// ── Signature verification ────────────────────────────────────────────────────

describe("verifyGitHubSignature", () => {
  it("returns true for a valid signature", () => {
    const body = '{"action":"opened"}';
    const sig = makeValidSig("my-secret", body);
    expect(verifyGitHubSignature("my-secret", body, sig)).toBe(true);
  });

  it("returns false when the secret is wrong", () => {
    const body = '{"action":"opened"}';
    const sig = makeValidSig("wrong-secret", body);
    expect(verifyGitHubSignature("my-secret", body, sig)).toBe(false);
  });

  it("returns false when the body has been tampered with", () => {
    const sig = makeValidSig("my-secret", '{"action":"opened"}');
    expect(verifyGitHubSignature("my-secret", '{"action":"closed"}', sig)).toBe(
      false,
    );
  });

  it("returns false when sigHeader is undefined", () => {
    expect(verifyGitHubSignature("secret", "body", undefined)).toBe(false);
  });

  it("returns false when sigHeader has wrong prefix (sha1 instead of sha256)", () => {
    expect(verifyGitHubSignature("secret", "body", "sha1=abc")).toBe(false);
  });

  it("returns false for an empty header string", () => {
    expect(verifyGitHubSignature("secret", "body", "")).toBe(false);
  });

  it("returns false for a malformed hex value (wrong length)", () => {
    expect(verifyGitHubSignature("secret", "body", "sha256=tooshort")).toBe(
      false,
    );
  });
});

// ── Prompt builders ───────────────────────────────────────────────────────────

const BASE_PR: GitHubPR = {
  number: 42,
  title: "Add authentication middleware",
  body: "Adds JWT to all routes",
  state: "open",
  html_url: "https://github.com/org/repo/pull/42",
  user: { login: "alice" },
  head: { ref: "feature/auth", sha: "abc123" },
  base: { ref: "main", sha: "def456" },
  merged_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const BASE_FILES: GitHubFile[] = [
  {
    filename: "src/auth.ts",
    status: "added",
    additions: 120,
    deletions: 0,
    changes: 120,
    patch: "+export function verifyToken(t: string) { return t; }",
  },
  {
    filename: "src/index.ts",
    status: "modified",
    additions: 5,
    deletions: 2,
    changes: 7,
  },
];

describe("buildPrSummaryPrompt", () => {
  it("includes PR number and title", () => {
    const p = buildPrSummaryPrompt(BASE_PR, BASE_FILES);
    expect(p).toContain("#42");
    expect(p).toContain("Add authentication middleware");
  });

  it("includes author and branch names", () => {
    const p = buildPrSummaryPrompt(BASE_PR, BASE_FILES);
    expect(p).toContain("alice");
    expect(p).toContain("feature/auth");
    expect(p).toContain("main");
  });

  it("lists changed filenames", () => {
    const p = buildPrSummaryPrompt(BASE_PR, BASE_FILES);
    expect(p).toContain("src/auth.ts");
    expect(p).toContain("src/index.ts");
  });

  it("substitutes '(none provided)' for null body", () => {
    const p = buildPrSummaryPrompt({ ...BASE_PR, body: null }, BASE_FILES);
    expect(p).toContain("(none provided)");
  });

  it("includes diff patch sample for files that have one", () => {
    const p = buildPrSummaryPrompt(BASE_PR, BASE_FILES);
    expect(p).toContain("verifyToken");
  });

  it("handles 30 files without crashing and shows total count", () => {
    const manyFiles: GitHubFile[] = Array.from({ length: 30 }, (_, i) => ({
      filename: `src/module${i}.ts`,
      status: "added" as const,
      additions: 1,
      deletions: 0,
      changes: 1,
    }));
    const p = buildPrSummaryPrompt(BASE_PR, manyFiles);
    expect(p).toContain("30 total");
  });
});

describe("buildReleaseNotesPrompt", () => {
  const commits: GitHubCommit[] = [
    {
      sha: "abc1234def",
      commit: {
        message: "feat: add dark mode\n\nFull body text that should be omitted",
        author: { name: "alice", date: "2026-01-01" },
      },
    },
    {
      sha: "def5678abc",
      commit: {
        message: "fix: resolve login crash",
        author: { name: "bob", date: "2026-01-02" },
      },
    },
  ];

  it("includes repo name and both refs", () => {
    const p = buildReleaseNotesPrompt("v1.0.0", "v1.1.0", commits, "org/repo");
    expect(p).toContain("org/repo");
    expect(p).toContain("v1.0.0");
    expect(p).toContain("v1.1.0");
  });

  it("uses only the first line of each commit message", () => {
    const p = buildReleaseNotesPrompt("v1.0.0", "v1.1.0", commits, "org/repo");
    expect(p).toContain("feat: add dark mode");
    expect(p).not.toContain("Full body text that should be omitted");
  });

  it("truncates commit SHA to 7 chars", () => {
    const p = buildReleaseNotesPrompt("v1.0.0", "v1.1.0", commits, "org/repo");
    expect(p).toContain("abc1234");
    expect(p).not.toContain("abc1234def");
  });

  it("shows total commit count", () => {
    const p = buildReleaseNotesPrompt("v1.0.0", "v1.1.0", commits, "org/repo");
    expect(p).toContain("2 total");
  });

  it("limits listed commits to 50 but shows real total", () => {
    const manyCommits: GitHubCommit[] = Array.from({ length: 60 }, (_, i) => ({
      sha: `sha${i.toString().padStart(7, "0")}`,
      commit: {
        message: `chore: commit ${i}`,
        author: { name: "dev", date: "2026-01-01" },
      },
    }));
    const p = buildReleaseNotesPrompt("v1", "v2", manyCommits, "org/repo");
    expect(p).toContain("60 total");
    expect(p).not.toContain("commit 50");
  });
});

// ── callAI helper ─────────────────────────────────────────────────────────────

describe("callAI", () => {
  it("calls the correct internal path with POST method", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Result" } }],
      }),
      text: jest.fn().mockResolvedValue(""),
    });
    await callAI(
      makeRequest as unknown as MockCtx["api"]["makeRequest"],
      "gpt-4o",
      "prompt",
    );
    expect(makeRequest).toHaveBeenCalledWith(
      AI_COMPLETIONS_PATH,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns content from OpenAI-style choices array", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: "OpenAI result" } }],
      }),
      text: jest.fn().mockResolvedValue(""),
    });
    const result = await callAI(
      makeRequest as unknown as MockCtx["api"]["makeRequest"],
      "gpt-4o",
      "prompt",
    );
    expect(result).toBe("OpenAI result");
  });

  it("returns content from Agentbase-native response shape", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ content: "Native result" }),
      text: jest.fn().mockResolvedValue(""),
    });
    const result = await callAI(
      makeRequest as unknown as MockCtx["api"]["makeRequest"],
      "claude-3-5-sonnet",
      "prompt",
    );
    expect(result).toBe("Native result");
  });

  it("throws an error when response is not ok", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Internal Server Error"),
    });
    await expect(
      callAI(
        makeRequest as unknown as MockCtx["api"]["makeRequest"],
        "gpt-4o",
        "prompt",
      ),
    ).rejects.toThrow("AI completions error 500");
  });

  it("includes model, messages, and temperature in request body", async () => {
    const makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ content: "" }),
      text: jest.fn().mockResolvedValue(""),
    });
    await callAI(
      makeRequest as unknown as MockCtx["api"]["makeRequest"],
      "gpt-4o-mini",
      "test prompt",
    );
    const [, options] = makeRequest.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
    };
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[0]).toMatchObject({
      role: "user",
      content: "test prompt",
    });
    expect(body.temperature).toBe(0.3);
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("GITHUB_API_BASE points to the GitHub REST API", () => {
    expect(GITHUB_API_BASE).toBe("https://api.github.com");
  });

  it("DEFAULT_MODEL is in SUPPORTED_MODELS", () => {
    expect(SUPPORTED_MODELS).toContain(DEFAULT_MODEL);
  });

  it("HANDLED_EVENTS includes push, pull_request, issues, release", () => {
    expect(HANDLED_EVENTS).toEqual(
      expect.arrayContaining(["push", "pull_request", "issues", "release"]),
    );
  });
});

// ── Plugin manifest & settings ────────────────────────────────────────────────

describe("plugin manifest", () => {
  it("has the correct name and version", () => {
    expect(plugin.manifest.name).toBe("github-integration");
    expect(plugin.manifest.version).toBe("1.0.0");
  });

  it("defines githubToken as encrypted", () => {
    expect(plugin.definition.settings?.["githubToken"]).toMatchObject({
      encrypted: true,
    });
  });

  it("defines webhookSecret as encrypted", () => {
    expect(plugin.definition.settings?.["webhookSecret"]).toMatchObject({
      encrypted: true,
    });
  });

  it("defines defaultSummaryModel as a select with all supported models", () => {
    const setting = plugin.definition.settings?.["defaultSummaryModel"];
    expect(setting?.type).toBe("select");
    expect(setting?.options).toEqual(
      expect.arrayContaining([...SUPPORTED_MODELS]),
    );
    expect(setting?.default).toBe(DEFAULT_MODEL);
  });
});

// ── app:init ──────────────────────────────────────────────────────────────────

describe("app:init", () => {
  it("registers exactly 6 endpoints", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    expect(ctx.api._endpoints).toHaveLength(6);
  });

  it("registers endpoints for all expected paths", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const paths = ctx.api._endpoints.map((e) => `${e.method} ${e.path}`);
    expect(paths).toContain("POST /connect");
    expect(paths).toContain("GET /repos");
    expect(paths).toContain("GET /repos/:owner/:repo/prs");
    expect(paths).toContain("POST /summarize-pr");
    expect(paths).toContain("POST /release-notes");
    expect(paths).toContain("POST /webhook");
  });

  it("logs initialization message", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("GitHub Integration initialized"),
    );
  });

  it("sets auth:false only on/webhook", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const webhook = ctx.api._endpoints.find((e) => e.path === "/webhook");
    expect(webhook?.auth).toBe(false);
    const connect = ctx.api._endpoints.find((e) => e.path === "/connect");
    expect(connect?.auth).toBe(true);
  });
});

// ── POST /connect ─────────────────────────────────────────────────────────────

describe("POST /connect", () => {
  async function call(ctx: MockCtx, body: unknown): Promise<MockRes> {
    const ep = getEndpoint(ctx, "POST", "/connect");
    const res = makeRes();
    await ep.handler(makeReq({ body }), res as unknown as EndpointResponse);
    return res;
  }

  it("returns 400 when token is missing from body", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const res = await call(ctx, {});
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain(
      "token is required",
    );
  });

  it("stores token record and returns login on success", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    ctx.api.makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        login: "octocat",
        name: "OctoCat",
        avatar_url: "https://example.com/avatar",
      }),
      text: jest.fn().mockResolvedValue(""),
    });
    const res = await call(ctx, { token: "ghp_testtoken" });
    expect(res._body).toMatchObject({ connected: true, login: "octocat" });
    const stored = (await ctx.api.db.get(buildTokenKey())) as {
      token: string;
      login: string;
    };
    expect(stored?.token).toBe("ghp_testtoken");
    expect(stored?.login).toBe("octocat");
  });

  it("returns 400 when GitHub rejects the token", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    ctx.api.makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Bad credentials"),
    });
    const res = await call(ctx, { token: "invalid_token" });
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain(
      "GitHub token validation failed",
    );
  });
});

// ── GET /repos ────────────────────────────────────────────────────────────────

describe("GET /repos", () => {
  async function call(ctx: MockCtx): Promise<MockRes> {
    const ep = getEndpoint(ctx, "GET", "/repos");
    const res = makeRes();
    await ep.handler(
      makeReq({ method: "GET" }),
      res as unknown as EndpointResponse,
    );
    return res;
  }

  it("returns 401 when no token is configured", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const res = await call(ctx);
    expect(res._status).toBe(401);
  });

  it("returns repo list and stores each repo in plugin DB", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    await ctx.api.db.set(buildTokenKey(), { token: "ghp_valid" });
    const mockRepos = [
      {
        full_name: "octocat/Hello-World",
        name: "Hello-World",
        owner: { login: "octocat" },
        description: "A test repo",
        private: false,
        html_url: "https://github.com/octocat/Hello-World",
        default_branch: "main",
      },
    ];
    ctx.api.makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRepos),
      text: jest.fn().mockResolvedValue(""),
    });
    const res = await call(ctx);
    expect((res._body as { total: number }).total).toBe(1);
    expect(
      (res._body as { repos: Array<{ fullName: string }> }).repos[0].fullName,
    ).toBe("octocat/Hello-World");
    const stored = (await ctx.api.db.get(
      buildRepoKey("octocat", "Hello-World"),
    )) as { owner: string; repo: string };
    expect(stored?.owner).toBe("octocat");
    expect(stored?.repo).toBe("Hello-World");
  });

  it("returns 502 when GitHub API call fails", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    await ctx.api.db.set(buildTokenKey(), { token: "ghp_valid" });
    ctx.api.makeRequest = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue("Forbidden"),
    });
    const res = await call(ctx);
    expect(res._status).toBe(502);
  });
});

// ── GET /repos/:owner/:repo/prs ───────────────────────────────────────────────

describe("GET /repos/:owner/:repo/prs", () => {
  async function call(
    ctx: MockCtx,
    owner: string,
    repo: string,
  ): Promise<MockRes> {
    const ep = getEndpoint(ctx, "GET", "/repos/:owner/:repo/prs");
    const res = makeRes();
    await ep.handler(
      makeReq({ method: "GET", params: { owner, repo } }),
      res as unknown as EndpointResponse,
    );
    return res;
  }

  it("returns 401 when no token configured", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const res = await call(ctx, "octocat", "Hello-World");
    expect(res._status).toBe(401);
  });

  it("returns a mapped PR list", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    await ctx.api.db.set(buildTokenKey(), { token: "ghp_valid" });
    const mockPRs: GitHubPR[] = [
      {
        number: 7,
        title: "Fix the thing",
        body: null,
        state: "open",
        html_url: "https://github.com/octocat/Hello-World/pull/7",
        user: { login: "alice" },
        head: { ref: "fix/thing", sha: "aaa" },
        base: { ref: "main", sha: "bbb" },
        merged_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
    ];
    ctx.api.makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockPRs),
      text: jest.fn().mockResolvedValue(""),
    });
    const res = await call(ctx, "octocat", "Hello-World");
    expect((res._body as { total: number }).total).toBe(1);
    expect(
      (res._body as { prs: Array<{ number: number; author: string }> }).prs[0],
    ).toMatchObject({ number: 7, author: "alice" });
  });
});

// ── POST /summarize-pr ────────────────────────────────────────────────────────

describe("POST /summarize-pr", () => {
  async function call(ctx: MockCtx, body: unknown): Promise<MockRes> {
    const ep = getEndpoint(ctx, "POST", "/summarize-pr");
    const res = makeRes();
    await ep.handler(makeReq({ body }), res as unknown as EndpointResponse);
    return res;
  }

  it("returns 400 when required fields are missing", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const res = await call(ctx, { owner: "octocat" });
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain("required");
  });

  it("returns 401 when no token configured (cache miss)", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const res = await call(ctx, {
      owner: "octocat",
      repo: "Hello-World",
      prNumber: 1,
    });
    expect(res._status).toBe(401);
  });

  it("returns cached summary without hitting GitHub or AI", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const cached: PRSummaryRecord = {
      owner: "octocat",
      repo: "Hello-World",
      prNumber: 1,
      summary: "Cached summary text",
      model: "gpt-4o",
      generatedAt: 1000,
    };
    await ctx.api.db.set(buildSummaryKey("octocat", "Hello-World", 1), cached);
    const res = await call(ctx, {
      owner: "octocat",
      repo: "Hello-World",
      prNumber: 1,
    });
    expect((res._body as { cached: boolean }).cached).toBe(true);
    expect((res._body as { summary: string }).summary).toBe(
      "Cached summary text",
    );
    expect(ctx.api.makeRequest).not.toHaveBeenCalled();
  });

  it("generates and caches a fresh summary on cache miss", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    await ctx.api.db.set(buildTokenKey(), { token: "ghp_valid" });
    const mockPR: GitHubPR = {
      ...BASE_PR,
      number: 99,
    };
    ctx.api.makeRequest = jest
      .fn()
      .mockResolvedValueOnce({
        // fetchPRDetails
        ok: true,
        json: jest.fn().mockResolvedValue(mockPR),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        // fetchPRFiles
        ok: true,
        json: jest.fn().mockResolvedValue(BASE_FILES),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        // callAI
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Fresh summary" } }],
        }),
        text: jest.fn().mockResolvedValue(""),
      });

    const res = await call(ctx, {
      owner: "octocat",
      repo: "Hello-World",
      prNumber: 99,
    });
    expect((res._body as { cached: boolean }).cached).toBe(false);
    expect((res._body as { summary: string }).summary).toBe("Fresh summary");
    // Verify stored in DB
    const stored = (await ctx.api.db.get(
      buildSummaryKey("octocat", "Hello-World", 99),
    )) as PRSummaryRecord;
    expect(stored?.summary).toBe("Fresh summary");
  });

  it("force:true bypasses the cache", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    await ctx.api.db.set(buildTokenKey(), { token: "ghp_valid" });
    await ctx.api.db.set(buildSummaryKey("octocat", "Hello-World", 1), {
      summary: "Old cached",
      model: "gpt-4o",
      generatedAt: 0,
    });
    ctx.api.makeRequest = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(BASE_PR),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Refreshed" } }],
        }),
        text: jest.fn().mockResolvedValue(""),
      });

    const res = await call(ctx, {
      owner: "octocat",
      repo: "Hello-World",
      prNumber: 1,
      force: true,
    });
    expect((res._body as { summary: string }).summary).toBe("Refreshed");
    expect((res._body as { cached: boolean }).cached).toBe(false);
  });
});

// ── POST /release-notes ───────────────────────────────────────────────────────

describe("POST /release-notes", () => {
  async function call(ctx: MockCtx, body: unknown): Promise<MockRes> {
    const ep = getEndpoint(ctx, "POST", "/release-notes");
    const res = makeRes();
    await ep.handler(makeReq({ body }), res as unknown as EndpointResponse);
    return res;
  }

  it("returns 400 when required fields are missing", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const res = await call(ctx, { owner: "octocat", repo: "Hello-World" });
    expect(res._status).toBe(400);
  });

  it("returns placeholder message when no commits found", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    await ctx.api.db.set(buildTokenKey(), { token: "ghp_valid" });
    ctx.api.makeRequest = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ commits: [] }),
      text: jest.fn().mockResolvedValue(""),
    });
    const res = await call(ctx, {
      owner: "octocat",
      repo: "Hello-World",
      fromRef: "v1.0.0",
      toRef: "v1.0.1",
    });
    expect((res._body as { commitCount: number }).commitCount).toBe(0);
    expect((res._body as { notes: string }).notes).toContain("No commits");
  });

  it("generates release notes from commits", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    await ctx.api.db.set(buildTokenKey(), { token: "ghp_valid" });
    const mockCommits: GitHubCommit[] = [
      {
        sha: "abc1234",
        commit: {
          message: "feat: new login page",
          author: { name: "alice", date: "2026-01-01" },
        },
      },
    ];
    ctx.api.makeRequest = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ commits: mockCommits }),
        text: jest.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            { message: { content: "## What's New\n- New login page" } },
          ],
        }),
        text: jest.fn().mockResolvedValue(""),
      });

    const res = await call(ctx, {
      owner: "octocat",
      repo: "Hello-World",
      fromRef: "v1.0.0",
      toRef: "v1.1.0",
    });
    expect((res._body as { commitCount: number }).commitCount).toBe(1);
    expect((res._body as { fromRef: string }).fromRef).toBe("v1.0.0");
    expect((res._body as { toRef: string }).toRef).toBe("v1.1.0");
    expect((res._body as { notes: string }).notes).toContain("What's New");
  });
});

// ── POST /webhook ─────────────────────────────────────────────────────────────

describe("POST /webhook", () => {
  async function call(
    ctx: MockCtx,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<MockRes> {
    const ep = getEndpoint(ctx, "POST", "/webhook");
    const res = makeRes();
    await ep.handler(
      makeReq({ method: "POST", headers, body }),
      res as unknown as EndpointResponse,
    );
    return res;
  }

  it("returns 400 when X-GitHub-Event header is absent", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const res = await call(ctx, {}, { action: "opened" });
    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toContain("X-GitHub-Event");
  });

  it("returns 401 when signature is invalid and secret is configured", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    ctx.api.getConfig = jest
      .fn()
      .mockImplementation((k: string) =>
        k === "webhookSecret" ? "my-secret" : undefined,
      );
    const res = await call(
      ctx,
      {
        "x-github-event": "push",
        "x-hub-signature-256":
          "sha256=invalidsig0000000000000000000000000000000000000000000000000000",
      },
      { repository: { full_name: "org/repo" } },
    );
    expect(res._status).toBe(401);
  });

  it("processes event when no webhook secret is configured", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    ctx.api.getConfig = jest.fn().mockReturnValue(undefined);
    const body = { repository: { full_name: "org/repo" }, action: "opened" };
    const res = await call(
      ctx,
      { "x-github-event": "push", "x-github-delivery": "del-001" },
      body,
    );
    expect(res._body).toMatchObject({
      received: true,
      processed: true,
      event: "push",
    });
    expect(ctx.api.events.emit).toHaveBeenCalledWith(
      "github:push",
      expect.objectContaining({ repoFullName: "org/repo" }),
    );
  });

  it("processes event when signature is valid", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    const secret = "webhook-secret-abc";
    const body = { repository: { full_name: "org/repo" } };
    const rawBody = JSON.stringify(body);
    const sig = makeValidSig(secret, rawBody);
    ctx.api.getConfig = jest
      .fn()
      .mockImplementation((k: string) =>
        k === "webhookSecret" ? secret : undefined,
      );
    const res = await call(
      ctx,
      { "x-github-event": "pull_request", "x-hub-signature-256": sig },
      body,
    );
    expect(res._body).toMatchObject({
      received: true,
      processed: true,
      event: "pull_request",
    });
  });

  it("logs the event to plugin DB using x-github-delivery as key", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    ctx.api.getConfig = jest.fn().mockReturnValue(undefined);
    const body = { repository: { full_name: "org/repo" }, action: "created" };
    await call(
      ctx,
      { "x-github-event": "issues", "x-github-delivery": "delivery-xyz" },
      body,
    );
    const stored = (await ctx.api.db.get(
      buildWebhookLogKey("delivery-xyz"),
    )) as WebhookEventRecord;
    expect(stored?.event).toBe("issues");
    expect(stored?.repoFullName).toBe("org/repo");
    expect(stored?.action).toBe("created");
  });

  it("returns processed:false for unsupported event types", async () => {
    const ctx = makeCtx();
    await initPlugin(ctx);
    ctx.api.getConfig = jest.fn().mockReturnValue(undefined);
    const res = await call(ctx, { "x-github-event": "star" }, {});
    expect(res._body).toMatchObject({ received: true, processed: false });
    expect(ctx.api.events.emit).not.toHaveBeenCalled();
  });

  it("emits on inter-plugin bus for all HANDLED_EVENTS", async () => {
    for (const event of HANDLED_EVENTS) {
      const ctx = makeCtx();
      await initPlugin(ctx);
      ctx.api.getConfig = jest.fn().mockReturnValue(undefined);
      const body = {
        repository: { full_name: "org/repo" },
        action: "published",
      };
      await call(ctx, { "x-github-event": event }, body);
      expect(ctx.api.events.emit).toHaveBeenCalledWith(
        `github:${event}`,
        expect.any(Object),
      );
    }
  });
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

describe("lifecycle", () => {
  it("onActivate logs an activation message", async () => {
    const ctx = makeCtx();
    await plugin.definition.onActivate?.(ctx);
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("activated"),
    );
  });

  it("onDeactivate logs a deactivation message", async () => {
    const ctx = makeCtx();
    await plugin.definition.onDeactivate?.(ctx);
    expect(ctx.api.log).toHaveBeenCalledWith(
      expect.stringContaining("deactivated"),
    );
  });
});
