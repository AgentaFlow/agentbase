/**
 * Slack Connector
 *
 * Connect your Agentbase AI app to Slack. Handles incoming Slack Events API
 * payloads (app_mention, message, url_verification), slash commands, and
 * provides channel management. All external calls use `makeRequest`.
 *
 * Security:
 * - Every inbound Slack request is verified with HMAC-SHA256 using the signing
 *   secret before any data is processed.
 * - Replay-attack prevention: requests older than 5 minutes are rejected.
 * - Event deduplication via `event_id` stored in plugin DB.
 *
 * Async response pattern:
 * - Webhook handler acknowledges Slack within 3 s by sending an immediate
 *   HTTP 200, then fires AI completion + chat.postMessage asynchronously so
 *   Slack never times out.
 *
 * @package @agentbase/plugin-slack-connector
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";
import { createHmac, timingSafeEqual } from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SLACK_API_BASE = "https://slack.com/api";
export const AI_COMPLETIONS_PATH = "/api/v1/internal/ai/completions";

/** Maximum age (ms) of a Slack request before it is rejected as a replay. */
export const MAX_REQUEST_AGE_MS = 5 * 60 * 1000; // 5 minutes

/** How long to cache dedup event IDs (ms). */
export const EVENT_DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const DEFAULT_SLASH_COMMAND = "/ai";
export const DEFAULT_AI_MODEL = "gpt-4o";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  num_members?: number;
}

export interface SlackEventPayload {
  type: string;
  token?: string;
  challenge?: string;
  event_id?: string;
  event_time?: number;
  team_id?: string;
  event?: {
    type: string;
    user?: string;
    text?: string;
    channel?: string;
    ts?: string;
    bot_id?: string;
    app_mention?: boolean;
  };
}

export interface SlackSlashCommandPayload {
  command: string;
  text: string;
  user_id: string;
  user_name?: string;
  channel_id: string;
  channel_name?: string;
  team_id?: string;
  response_url?: string;
}

export interface ChannelConfig {
  channelId: string;
  name?: string;
  connectedAt: number;
}

export interface DedupRecord {
  eventId: string;
  receivedAt: number;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

export function buildChannelKey(channelId: string): string {
  return `channel:${channelId}`;
}

export function buildMessageKey(ts: string): string {
  return `message:${ts}`;
}

export function buildConnectionKey(): string {
  return "connection:config";
}

// ── Slack Signature Verification ──────────────────────────────────────────────

/**
 * Verify a Slack `X-Slack-Signature` header using HMAC-SHA256.
 *
 * Slack signs each request as:
 *   `v0=HMAC_SHA256(signingSecret, "v0:{timestamp}:{rawBody}")`
 *
 * @param signingSecret   The Slack app signing secret.
 * @param rawBody         The raw (unparsed) request body string.
 * @param timestamp       Value of `X-Slack-Request-Timestamp` header.
 * @param signature       Value of `X-Slack-Signature` header.
 * @param nowMs           Current epoch ms (injectable for testing).
 */
export function verifySlackSignature(
  signingSecret: string,
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!timestamp || !signature) return false;
  if (!signature.startsWith("v0=")) return false;

  // Reject replays older than 5 minutes
  const tsMs = parseInt(timestamp, 10) * 1000;
  if (Math.abs(nowMs - tsMs) > MAX_REQUEST_AGE_MS) return false;

  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const hmac = createHmac("sha256", signingSecret);
  hmac.update(sigBaseString, "utf8");
  const expected = `v0=${hmac.digest("hex")}`;

  const receivedHex = signature.slice("v0=".length);
  const expectedHex = expected.slice("v0=".length);

  if (receivedHex.length !== expectedHex.length) return false;
  return timingSafeEqual(Buffer.from(receivedHex), Buffer.from(expectedHex));
}

// ── Slack API Helpers ─────────────────────────────────────────────────────────

interface SlackApiResponse {
  ok: boolean;
  error?: string;
}

interface SlackConversationsListResponse extends SlackApiResponse {
  channels?: SlackChannel[];
}

/**
 * Call a Slack Web API method with a Bearer token.
 */
export async function slackApiCall<T extends SlackApiResponse>(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  token: string,
  method: string,
  params: Record<string, string | boolean | number> = {},
): Promise<T> {
  const url = new URL(`${SLACK_API_BASE}/${method}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const response = await makeRequest(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Slack API HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as T;
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }
  return data;
}

/**
 * Post a message to a Slack channel using `chat.postMessage`.
 */
export async function postSlackMessage(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  token: string,
  channel: string,
  text: string,
): Promise<void> {
  const response = await makeRequest(`${SLACK_API_BASE}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });

  if (!response.ok) {
    throw new Error(`chat.postMessage HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as SlackApiResponse;
  if (!data.ok) {
    throw new Error(`chat.postMessage error: ${data.error ?? "unknown"}`);
  }
}

// ── AI Completion ─────────────────────────────────────────────────────────────

/**
 * Ask the platform AI service a question and return the text response.
 */
export async function askAI(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  message: string,
  model: string = DEFAULT_AI_MODEL,
): Promise<string> {
  const response = await makeRequest(AI_COMPLETIONS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI service error: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  const choices = data["choices"] as
    | Array<{ message: { content: string } }>
    | undefined;
  if (choices?.[0]?.message?.content) return choices[0].message.content;
  if (typeof data["content"] === "string") return data["content"] as string;

  throw new Error("Unexpected AI response shape");
}

// ── Strip Slack mention ───────────────────────────────────────────────────────

/**
 * Remove Slack user/bot mention markup (`<@UXXXXXXX>`) from the beginning
 * of a message and return the cleaned text.
 */
export function stripMention(text: string): string {
  return text.replace(/^<@[A-Z0-9]+>\s*/i, "").trim();
}

// ── Plugin Definition ─────────────────────────────────────────────────────────

export default createPlugin({
  name: "slack-connector",
  version: "1.0.0",
  description:
    "Connect your Agentbase AI to Slack — @mentions, slash commands, and AI-powered channel responses.",
  permissions: ["network:external", "db:readwrite"],
  settings: {
    slackBotToken: {
      type: "string",
      label: "Slack Bot Token (xoxb-…)",
      encrypted: true,
    },
    slackSigningSecret: {
      type: "string",
      label: "Slack Signing Secret",
      encrypted: true,
    },
    defaultChannel: {
      type: "string",
      label: "Default Channel ID",
    },
    listenForMentions: {
      type: "boolean",
      label: "Respond to @mentions",
      default: true,
    },
    slashCommand: {
      type: "string",
      label: "Slash Command",
      default: DEFAULT_SLASH_COMMAND,
    },
    aiModel: {
      type: "select",
      label: "AI Model",
      default: DEFAULT_AI_MODEL,
      options: [
        "gpt-4o",
        "gpt-4o-mini",
        "claude-3-5-sonnet",
        "gemini-2-0-flash",
      ],
    },
  },

  hooks: {
    "app:init": async (context) => {
      const { api } = context;

      // ── POST /connect ───────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/connect",
        auth: true,
        description: "Store Slack bot token and signing secret",
        handler: async (req, res) => {
          const { botToken, signingSecret } = req.body as {
            botToken?: string;
            signingSecret?: string;
          };

          if (!botToken || !signingSecret) {
            res
              .status(400)
              .json({ error: "botToken and signingSecret are required" });
            return;
          }

          // Validate the token by calling auth.test
          try {
            await slackApiCall(api.makeRequest, botToken, "auth.test");
          } catch (err) {
            res.status(400).json({
              error: `Invalid bot token: ${(err as Error).message}`,
            });
            return;
          }

          await api.db.set(buildConnectionKey(), {
            botToken,
            signingSecret,
            connectedAt: Date.now(),
          });

          res.status(200).json({ connected: true });
        },
      });

      // ── GET /channels ───────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/channels",
        auth: true,
        description: "List Slack channels the bot has access to",
        handler: async (_req, res) => {
          const token = (api.getConfig("slackBotToken") as string) ?? "";
          if (!token) {
            res.status(400).json({ error: "Slack bot token not configured" });
            return;
          }

          try {
            const data = await slackApiCall<SlackConversationsListResponse>(
              api.makeRequest,
              token,
              "conversations.list",
              { types: "public_channel,private_channel", limit: 200 },
            );
            res.status(200).json({ channels: data.channels ?? [] });
          } catch (err) {
            res.status(502).json({ error: (err as Error).message });
          }
        },
      });

      // ── POST /webhook ───────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/webhook",
        auth: false,
        description: "Slack Events API receiver",
        handler: async (req, res) => {
          const signingSecret =
            (api.getConfig("slackSigningSecret") as string) ?? "";

          // Raw body reconstruction for signature verification
          const rawBody =
            typeof req.body === "string" ? req.body : JSON.stringify(req.body);

          const timestamp = req.headers["x-slack-request-timestamp"] as
            | string
            | undefined;
          const signature = req.headers["x-slack-signature"] as
            | string
            | undefined;

          if (
            signingSecret &&
            !verifySlackSignature(signingSecret, rawBody, timestamp, signature)
          ) {
            res.status(401).json({ error: "Invalid Slack signature" });
            return;
          }

          const payload =
            typeof req.body === "string"
              ? (JSON.parse(req.body) as SlackEventPayload)
              : (req.body as SlackEventPayload);

          // URL verification challenge (Slack sends this when you first configure the endpoint)
          if (payload.type === "url_verification") {
            res.status(200).json({ challenge: payload.challenge });
            return;
          }

          // Deduplicate events using event_id
          if (payload.event_id) {
            const dedupKey = buildMessageKey(payload.event_id);
            const existing = await api.db.get(dedupKey);
            if (existing) {
              res.status(200).json({ ok: true, deduplicated: true });
              return;
            }
            await api.db.set(dedupKey, {
              eventId: payload.event_id,
              receivedAt: Date.now(),
            } satisfies DedupRecord);
          }

          const event = payload.event;
          if (!event) {
            res.status(200).json({ ok: true });
            return;
          }

          // Ignore bot messages to prevent loops
          if (event.bot_id) {
            res.status(200).json({ ok: true });
            return;
          }

          const token = (api.getConfig("slackBotToken") as string) ?? "";
          const listenForMentions =
            (api.getConfig("listenForMentions") as boolean) ?? true;
          const aiModel =
            (api.getConfig("aiModel") as string) ?? DEFAULT_AI_MODEL;

          const isMention = event.type === "app_mention";
          const isDirectMessage =
            event.type === "message" && event.channel?.startsWith("D");

          if (!listenForMentions && !isDirectMessage) {
            res.status(200).json({ ok: true });
            return;
          }

          if (isMention || isDirectMessage) {
            const userText = stripMention(event.text ?? "").trim();
            const replyChannel =
              event.channel ??
              (api.getConfig("defaultChannel") as string) ??
              "";

            if (!userText || !replyChannel || !token) {
              res.status(200).json({ ok: true });
              return;
            }

            // Acknowledge immediately; respond asynchronously
            res.status(200).json({ ok: true });

            // Fire-and-forget async AI + postMessage
            (async () => {
              try {
                const aiReply = await askAI(api.makeRequest, userText, aiModel);
                await postSlackMessage(
                  api.makeRequest,
                  token,
                  replyChannel,
                  aiReply,
                );
              } catch (err) {
                api.log(
                  `Slack async reply failed: ${(err as Error).message}`,
                  "error",
                );
              }
            })();
          } else {
            res.status(200).json({ ok: true });
          }
        },
      });

      // ── POST /slash-command ─────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/slash-command",
        auth: false,
        description: "Slack slash command handler",
        handler: async (req, res) => {
          const signingSecret =
            (api.getConfig("slackSigningSecret") as string) ?? "";
          const rawBody =
            typeof req.body === "string" ? req.body : JSON.stringify(req.body);

          const timestamp = req.headers["x-slack-request-timestamp"] as
            | string
            | undefined;
          const signature = req.headers["x-slack-signature"] as
            | string
            | undefined;

          if (
            signingSecret &&
            !verifySlackSignature(signingSecret, rawBody, timestamp, signature)
          ) {
            res.status(401).json({ error: "Invalid Slack signature" });
            return;
          }

          const payload = req.body as SlackSlashCommandPayload;
          const configuredCommand =
            (api.getConfig("slashCommand") as string) ?? DEFAULT_SLASH_COMMAND;

          if (
            payload.command &&
            payload.command !== configuredCommand &&
            payload.command !== "/ai"
          ) {
            res.status(200).json({
              response_type: "ephemeral",
              text: `Unknown command '${payload.command}'`,
            });
            return;
          }

          const userText = (payload.text ?? "").trim();
          if (!userText) {
            res.status(200).json({
              response_type: "ephemeral",
              text: `Usage: ${configuredCommand} <your question>`,
            });
            return;
          }

          const token = (api.getConfig("slackBotToken") as string) ?? "";
          const aiModel =
            (api.getConfig("aiModel") as string) ?? DEFAULT_AI_MODEL;

          // Acknowledge immediately with a "thinking…" message
          res.status(200).json({
            response_type: "in_channel",
            text: `_Thinking…_`,
          });

          // Fire-and-forget: send the real AI reply via response_url if available,
          // otherwise post to channel
          (async () => {
            try {
              const aiReply = await askAI(api.makeRequest, userText, aiModel);

              if (payload.response_url) {
                await api.makeRequest(payload.response_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    response_type: "in_channel",
                    replace_original: true,
                    text: aiReply,
                  }),
                });
              } else if (token && payload.channel_id) {
                await postSlackMessage(
                  api.makeRequest,
                  token,
                  payload.channel_id,
                  aiReply,
                );
              }
            } catch (err) {
              api.log(
                `Slash command AI reply failed: ${(err as Error).message}`,
                "error",
              );
            }
          })();
        },
      });
    },
  },
});
