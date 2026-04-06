/**
 * GitHub Integration
 *
 * Summarize pull requests, generate release notes, and respond to GitHub
 * webhook events. Uses the GitHub REST API v3 via makeRequest (external URLs).
 * AI summaries are generated via the platform's internal AI completions endpoint.
 *
 * Webhook signature verification uses HMAC-SHA256 (X-Hub-Signature-256) with
 * Node's built-in `crypto` module — no eval/exec/child_process used.
 *
 * @package @agentbase/plugin-github-integration
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";
import { createHmac, timingSafeEqual } from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

export const GITHUB_API_BASE = "https://api.github.com";

/** Internal platform AI completions endpoint (same pattern as content-generator). */
export const AI_COMPLETIONS_PATH = "/api/v1/internal/ai/completions";

export const SUPPORTED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet",
  "gemini-2-0-flash",
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];
export const DEFAULT_MODEL: SupportedModel = "gpt-4o";

/** Webhook events this plugin handles and re-emits on the inter-plugin bus. */
export const HANDLED_EVENTS = ["push", "pull_request", "issues", "release"];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed" | "merged";
  html_url: string;
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  merged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}

export interface ConnectedRepo {
  owner: string;
  repo: string;
  fullName: string;
  connectedAt: number;
}

export interface PRSummaryRecord {
  owner: string;
  repo: string;
  prNumber: number;
  summary: string;
  model: string;
  generatedAt: number;
}

export interface WebhookEventRecord {
  event: string;
  action?: string;
  repoFullName: string;
  receivedAt: number;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

export function buildRepoKey(owner: string, repo: string): string {
  return `repo:${owner}/${repo}`;
}

export function buildSummaryKey(
  owner: string,
  repo: string,
  prNumber: number,
): string {
  return `summary:${owner}/${repo}:${prNumber}`;
}

export function buildTokenKey(): string {
  return "connected:token";
}

export function buildWebhookLogKey(id: string): string {
  return `webhook:${id}`;
}

// ── Signature Verification ────────────────────────────────────────────────────

/**
 * Verify a GitHub webhook X-Hub-Signature-256 header using HMAC-SHA256.
 * Uses timing-safe comparison to prevent timing-attack leaks.
 *
 * @param secret     The webhook secret configured in GitHub.
 * @param rawBody    The raw request body string (pre-parse or re-stringified).
 * @param sigHeader  The value of the X-Hub-Signature-256 header.
 */
export function verifyGitHubSignature(
  secret: string,
  rawBody: string,
  sigHeader: string | undefined,
): boolean {
  if (!sigHeader || !sigHeader.startsWith("sha256=")) return false;
  const received = sigHeader.slice("sha256=".length);
  const hmac = createHmac("sha256", secret);
  hmac.update(rawBody, "utf8");
  const expected = hmac.digest("hex");
  // timingSafeEqual requires equal-length buffers; guard against malformed headers
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// ── Prompt Builders ───────────────────────────────────────────────────────────

/** Build an AI prompt to summarize a pull request. */
export function buildPrSummaryPrompt(
  pr: GitHubPR,
  files: GitHubFile[],
): string {
  const fileLines = files
    .slice(0, 20)
    .map(
      (f) =>
        `  ${f.status.padEnd(8)} ${f.filename} (+${f.additions}/-${f.deletions})`,
    )
    .join("\n");

  const patchSamples = files
    .filter((f) => f.patch)
    .slice(0, 5)
    .map(
      (f) =>
        `### ${f.filename}\n\`\`\`diff\n${(f.patch ?? "").slice(0, 600)}\n\`\`\``,
    )
    .join("\n\n");

  return `You are a senior software engineer reviewing a pull request. Provide a concise, technical summary.

## Pull Request: #${pr.number} — ${pr.title}

**Author:** ${pr.user.login}
**Branch:** \`${pr.head.ref}\` → \`${pr.base.ref}\`
**Description:** ${pr.body ?? "(none provided)"}

## Changed Files (${files.length} total)
${fileLines}

${patchSamples ? `## Key Diffs (sample)\n${patchSamples}` : ""}

Please provide:
1. **Summary** (2–3 sentences): What does this PR do?
2. **Key Changes** (bullet list): The most important modifications
3. **Potential Concerns** (if any): Review flags, breaking changes, missing tests
4. **Suggested Review Focus**: Which files/sections deserve the most attention

Be concise and technical.`;
}

/** Build an AI prompt to generate release notes from a list of commits. */
export function buildReleaseNotesPrompt(
  fromRef: string,
  toRef: string,
  commits: GitHubCommit[],
  repoName: string,
): string {
  const commitLines = commits
    .slice(0, 50)
    .map(
      (c) =>
        `- ${c.commit.message.split("\n")[0]} (${c.sha.slice(0, 7)}) by ${c.commit.author.name}`,
    )
    .join("\n");

  return `You are a technical writer generating release notes for a software project.

## Repository: ${repoName}
## Release: ${toRef} (changes since ${fromRef})

## Commits included (${commits.length} total):
${commitLines}

Please generate professional release notes in GitHub Flavored Markdown. Include:
1. **What's New** — notable features and enhancements
2. **Bug Fixes** — fixes grouped logically
3. **Breaking Changes** — (if any) with migration guidance
4. **Internal / Maintenance** — refactors, dependency updates, CI changes

Group related commits. Skip merge commits and trivial changes. Use imperative mood (e.g., "Add", "Fix", "Remove").`;
}

// ── GitHub API Helpers ────────────────────────────────────────────────────────

type MakeRequest = PluginContext["api"]["makeRequest"];

/** Call the GitHub REST API with a PAT for authentication. */
export async function githubGet<T>(
  makeRequest: MakeRequest,
  token: string,
  path: string,
): Promise<T> {
  const resp = await makeRequest(`${GITHUB_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub API error ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}

/** Fetch the authenticated user's profile — used to verify the token. */
export async function fetchGitHubUser(
  makeRequest: MakeRequest,
  token: string,
): Promise<GitHubUser> {
  return githubGet<GitHubUser>(makeRequest, token, "/user");
}

/** List repos accessible to the token (first page, sorted by updated). */
export async function fetchUserRepos(
  makeRequest: MakeRequest,
  token: string,
  perPage = 100,
): Promise<GitHubRepo[]> {
  return githubGet<GitHubRepo[]>(
    makeRequest,
    token,
    `/user/repos?per_page=${perPage}&sort=updated`,
  );
}

/** List pull requests for a repository. */
export async function fetchRepoPRs(
  makeRequest: MakeRequest,
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
): Promise<GitHubPR[]> {
  return githubGet<GitHubPR[]>(
    makeRequest,
    token,
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=50`,
  );
}

/** Fetch a single pull request's details. */
export async function fetchPRDetails(
  makeRequest: MakeRequest,
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<GitHubPR> {
  return githubGet<GitHubPR>(
    makeRequest,
    token,
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
  );
}

/** Fetch the list of files changed in a pull request (up to 100). */
export async function fetchPRFiles(
  makeRequest: MakeRequest,
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<GitHubFile[]> {
  return githubGet<GitHubFile[]>(
    makeRequest,
    token,
    `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
  );
}

/** Fetch commits between two refs (tags, branches, or SHAs). */
export async function fetchCompareCommits(
  makeRequest: MakeRequest,
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<GitHubCommit[]> {
  const data = await githubGet<{ commits: GitHubCommit[] }>(
    makeRequest,
    token,
    `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
  );
  return data.commits ?? [];
}

// ── AI Completion Helper ──────────────────────────────────────────────────────

/** Send a prompt to the platform's internal AI completions endpoint. */
export async function callAI(
  makeRequest: MakeRequest,
  model: string,
  prompt: string,
): Promise<string> {
  const resp = await makeRequest(AI_COMPLETIONS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI completions error ${resp.status}: ${text}`);
  }
  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    content?: string;
  };
  // Support both OpenAI-style and Agentbase-native response shapes
  return data.choices?.[0]?.message?.content ?? data.content ?? "";
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default createPlugin({
  name: "github-integration",
  version: "1.0.0",
  description:
    "Summarize pull requests, generate release notes, and respond to GitHub webhook events.",
  author: "Agentbase Team",

  settings: {
    githubToken: {
      type: "string",
      label: "GitHub Personal Access Token",
      encrypted: true,
    },
    webhookSecret: {
      type: "string",
      label: "GitHub Webhook Secret",
      encrypted: true,
    },
    defaultSummaryModel: {
      type: "select",
      label: "Default Summary Model",
      options: [...SUPPORTED_MODELS],
      default: DEFAULT_MODEL,
    },
  },

  hooks: {
    /**
     * app:init — register all endpoints. Handlers close over `context` so
     * they have access to the plugin DB, config, and makeRequest.
     */
    "app:init": async (context: PluginContext) => {
      context.api.log("GitHub Integration initialized");

      // ── POST /connect ────────────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "POST",
        path: "/connect",
        auth: true,
        description:
          "Store a GitHub Personal Access Token and verify it with the GitHub API.",
        handler: async (req, res) => {
          const { token } = (req.body ?? {}) as { token?: string };
          if (!token) {
            res.status(400).json({ error: "token is required" });
            return;
          }
          try {
            const user = await fetchGitHubUser(context.api.makeRequest, token);
            await context.api.db.set(buildTokenKey(), {
              token,
              login: user.login,
              connectedAt: Date.now(),
            });
            res.json({ connected: true, login: user.login });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(400).json({
              error: `GitHub token validation failed: ${message}`,
            });
          }
        },
      });

      // ── GET /repos ───────────────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "GET",
        path: "/repos",
        auth: true,
        description:
          "List GitHub repos accessible to the configured token. Stores each repo in plugin DB.",
        handler: async (_req, res) => {
          const tokenRecord = (await context.api.db.get(buildTokenKey())) as {
            token: string;
          } | null;
          if (!tokenRecord?.token) {
            res.status(401).json({
              error: "No GitHub token configured. POST /connect first.",
            });
            return;
          }
          try {
            const repos = await fetchUserRepos(
              context.api.makeRequest,
              tokenRecord.token,
            );
            // Cache each repo for reference by other endpoints
            await Promise.all(
              repos.map((r) =>
                context.api.db.set(buildRepoKey(r.owner.login, r.name), {
                  owner: r.owner.login,
                  repo: r.name,
                  fullName: r.full_name,
                  connectedAt: Date.now(),
                } satisfies ConnectedRepo),
              ),
            );
            res.json({
              repos: repos.map((r) => ({
                fullName: r.full_name,
                private: r.private,
                description: r.description,
                defaultBranch: r.default_branch,
              })),
              total: repos.length,
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(502).json({ error: message });
          }
        },
      });

      // ── GET /repos/:owner/:repo/prs ──────────────────────────────────────
      context.api.registerEndpoint({
        method: "GET",
        path: "/repos/:owner/:repo/prs",
        auth: true,
        description:
          "List pull requests for a repository. Query ?state=open|closed|all (default: open).",
        handler: async (req, res) => {
          const owner = req.params["owner"];
          const repo = req.params["repo"];
          const state =
            (req.query["state"] as "open" | "closed" | "all") ?? "open";
          if (!owner || !repo) {
            res
              .status(400)
              .json({ error: "owner and repo path params are required" });
            return;
          }
          const tokenRecord = (await context.api.db.get(buildTokenKey())) as {
            token: string;
          } | null;
          if (!tokenRecord?.token) {
            res.status(401).json({ error: "No GitHub token configured" });
            return;
          }
          try {
            const prs = await fetchRepoPRs(
              context.api.makeRequest,
              tokenRecord.token,
              owner,
              repo,
              state,
            );
            res.json({
              prs: prs.map((pr) => ({
                number: pr.number,
                title: pr.title,
                state: pr.state,
                author: pr.user.login,
                head: pr.head.ref,
                base: pr.base.ref,
                url: pr.html_url,
                createdAt: pr.created_at,
              })),
              total: prs.length,
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(502).json({ error: message });
          }
        },
      });

      // ── POST /summarize-pr ───────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "POST",
        path: "/summarize-pr",
        auth: true,
        description:
          "Generate an AI summary for a pull request. Results are cached; pass force:true to regenerate.",
        handler: async (req, res) => {
          const {
            owner,
            repo,
            prNumber,
            model: requestModel,
            force,
          } = (req.body ?? {}) as {
            owner?: string;
            repo?: string;
            prNumber?: number;
            model?: string;
            force?: boolean;
          };

          if (!owner || !repo || prNumber === undefined) {
            res
              .status(400)
              .json({ error: "owner, repo, and prNumber are required" });
            return;
          }

          // Return cached summary unless force-refresh is requested
          if (!force) {
            const cached = (await context.api.db.get(
              buildSummaryKey(owner, repo, prNumber),
            )) as PRSummaryRecord | null;
            if (cached) {
              res.json({
                summary: cached.summary,
                model: cached.model,
                cached: true,
                generatedAt: cached.generatedAt,
              });
              return;
            }
          }

          const tokenRecord = (await context.api.db.get(buildTokenKey())) as {
            token: string;
          } | null;
          if (!tokenRecord?.token) {
            res.status(401).json({ error: "No GitHub token configured" });
            return;
          }

          try {
            const [pr, files] = await Promise.all([
              fetchPRDetails(
                context.api.makeRequest,
                tokenRecord.token,
                owner,
                repo,
                prNumber,
              ),
              fetchPRFiles(
                context.api.makeRequest,
                tokenRecord.token,
                owner,
                repo,
                prNumber,
              ),
            ]);

            const model =
              requestModel ??
              (context.api.getConfig("defaultSummaryModel") as
                | string
                | undefined) ??
              DEFAULT_MODEL;
            const prompt = buildPrSummaryPrompt(pr, files);
            const summary = await callAI(
              context.api.makeRequest,
              model,
              prompt,
            );

            const record: PRSummaryRecord = {
              owner,
              repo,
              prNumber,
              summary,
              model,
              generatedAt: Date.now(),
            };
            await context.api.db.set(
              buildSummaryKey(owner, repo, prNumber),
              record,
            );

            res.json({
              summary,
              model,
              cached: false,
              generatedAt: record.generatedAt,
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(502).json({ error: message });
          }
        },
      });

      // ── POST /release-notes ──────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "POST",
        path: "/release-notes",
        auth: true,
        description:
          "Generate AI release notes between two Git refs (tags, branches, or SHAs).",
        handler: async (req, res) => {
          const {
            owner,
            repo,
            fromRef,
            toRef,
            model: requestModel,
          } = (req.body ?? {}) as {
            owner?: string;
            repo?: string;
            fromRef?: string;
            toRef?: string;
            model?: string;
          };

          if (!owner || !repo || !fromRef || !toRef) {
            res.status(400).json({
              error: "owner, repo, fromRef, and toRef are required",
            });
            return;
          }

          const tokenRecord = (await context.api.db.get(buildTokenKey())) as {
            token: string;
          } | null;
          if (!tokenRecord?.token) {
            res.status(401).json({ error: "No GitHub token configured" });
            return;
          }

          try {
            const commits = await fetchCompareCommits(
              context.api.makeRequest,
              tokenRecord.token,
              owner,
              repo,
              fromRef,
              toRef,
            );

            if (commits.length === 0) {
              res.json({
                notes: "_(No commits found between the specified refs.)_",
                commitCount: 0,
                fromRef,
                toRef,
              });
              return;
            }

            const model =
              requestModel ??
              (context.api.getConfig("defaultSummaryModel") as
                | string
                | undefined) ??
              DEFAULT_MODEL;
            const prompt = buildReleaseNotesPrompt(
              fromRef,
              toRef,
              commits,
              `${owner}/${repo}`,
            );
            const notes = await callAI(context.api.makeRequest, model, prompt);

            res.json({
              notes,
              commitCount: commits.length,
              fromRef,
              toRef,
              model,
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(502).json({ error: message });
          }
        },
      });

      // ── POST /webhook ────────────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "POST",
        path: "/webhook",
        auth: false, // GitHub sends webhooks without user auth
        description:
          "Receive GitHub webhook events. Verifies X-Hub-Signature-256 when webhookSecret is configured.",
        handler: async (req, res) => {
          const event = req.headers["x-github-event"] as string | undefined;
          const deliveryId = req.headers["x-github-delivery"] as
            | string
            | undefined;
          const sigHeader = req.headers["x-hub-signature-256"] as
            | string
            | undefined;

          if (!event) {
            res.status(400).json({ error: "Missing X-GitHub-Event header" });
            return;
          }

          // Verify HMAC signature if a webhook secret is configured
          const webhookSecret = context.api.getConfig("webhookSecret") as
            | string
            | undefined;
          if (webhookSecret) {
            // Re-stringify for HMAC — best-effort when SDK provides parsed body
            const rawBody =
              typeof req.body === "string"
                ? req.body
                : JSON.stringify(req.body);
            if (!verifyGitHubSignature(webhookSecret, rawBody, sigHeader)) {
              res.status(401).json({ error: "Invalid webhook signature" });
              return;
            }
          }

          const payload = req.body as Record<string, unknown>;
          const repoFullName =
            (payload["repository"] as { full_name?: string } | undefined)
              ?.full_name ?? "unknown";
          const action = payload["action"] as string | undefined;

          // Log the event to plugin DB for audit / debugging
          const logId =
            deliveryId ??
            `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
          await context.api.db.set(buildWebhookLogKey(logId), {
            event,
            action,
            repoFullName,
            receivedAt: Date.now(),
          } satisfies WebhookEventRecord);

          if (!HANDLED_EVENTS.includes(event)) {
            res.json({
              received: true,
              processed: false,
              reason: `Event '${event}' not handled`,
            });
            return;
          }

          // Emit on the inter-plugin event bus (e.g., Knowledge Base can refresh on push)
          await context.api.events.emit(`github:${event}`, {
            repoFullName,
            action,
            payload,
          });

          res.json({
            received: true,
            processed: true,
            event,
            deliveryId: logId,
          });
        },
      });
    },
  },

  onActivate: async (context: PluginContext) => {
    context.api.log("GitHub Integration activated");
  },

  onDeactivate: async (context: PluginContext) => {
    context.api.log("GitHub Integration deactivated");
  },
});
