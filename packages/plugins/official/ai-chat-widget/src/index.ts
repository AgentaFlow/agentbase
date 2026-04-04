/**
 * AI Chat Widget
 *
 * Embeddable chat interface with streaming, multi-model support, and session
 * management. Sessions are stored in the plugin's scoped database (MongoDB-backed
 * KV store). The system prompt and model settings are configurable per-application.
 *
 * @package @agentbase/plugin-ai-chat-widget
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SUPPORTED_MODELS = [
  "gpt-4o",
  "claude-3-5-sonnet",
  "gemini-2-0-flash",
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export const DEFAULT_MODEL: SupportedModel = "gpt-4o";
export const DEFAULT_MAX_HISTORY = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
}

export interface ChatSession {
  id: string;
  appId: string;
  userId: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a random session ID using timestamp + random component. */
export function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** Plugin DB key for a session record. */
export function buildSessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

/** Plugin DB key tracking the active session for an app+user pair. */
export function buildActiveKey(appId: string, userId: string): string {
  return `active:${appId}:${userId}`;
}

/**
 * Keep only the most recent `maxHistory` messages, dropping from the oldest end.
 * If maxHistory is 0 (or negative), returns the array unchanged.
 */
export function trimMessages(
  messages: ChatMessage[],
  maxHistory: number,
): ChatMessage[] {
  if (maxHistory <= 0 || messages.length <= maxHistory) return messages;
  return messages.slice(messages.length - maxHistory);
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default createPlugin({
  name: "ai-chat-widget",
  version: "1.0.0",
  description:
    "Embeddable chat interface with streaming, multi-model support, and session management.",
  author: "Agentbase Team",

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    systemPrompt: {
      type: "string",
      label: "System Prompt",
      default: "",
    },
    model: {
      type: "select",
      label: "AI Model",
      options: [...SUPPORTED_MODELS],
      default: DEFAULT_MODEL,
    },
    streamingEnabled: {
      type: "boolean",
      label: "Enable Streaming Responses",
      default: true,
    },
    maxHistory: {
      type: "number",
      label: "Max Message History (per session)",
      default: DEFAULT_MAX_HISTORY,
    },
  },

  // ── Hooks ──────────────────────────────────────────────────────────────────
  hooks: {
    /**
     * app:init — register the four session endpoints.
     * Endpoint handlers close over `context` to access the plugin DB.
     */
    "app:init": async (context: PluginContext) => {
      context.api.log("AI Chat Widget initialized");

      // GET /config — return public plugin configuration
      context.api.registerEndpoint({
        method: "GET",
        path: "/config",
        auth: true,
        description: "Return public plugin configuration",
        handler: async (_req, res) => {
          res.json({
            widgetId: "ai-chat-widget",
            model: (context.api.getConfig("model") as string) ?? DEFAULT_MODEL,
            streamingEnabled:
              (context.api.getConfig("streamingEnabled") as boolean) ?? true,
            maxHistory:
              (context.api.getConfig("maxHistory") as number) ??
              DEFAULT_MAX_HISTORY,
          });
        },
      });

      // POST /session — create a new chat session
      context.api.registerEndpoint({
        method: "POST",
        path: "/session",
        auth: true,
        description: "Create a new chat session",
        handler: async (req, res) => {
          const userId = req.user?.id ?? "anonymous";
          const session: ChatSession = {
            id: generateSessionId(),
            appId: context.appId,
            userId,
            messages: [],
            model: (context.api.getConfig("model") as string) ?? DEFAULT_MODEL,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await context.api.db.set(buildSessionKey(session.id), session);
          res.status(201).json(session);
        },
      });

      // GET /session/:id — retrieve a session by ID
      context.api.registerEndpoint({
        method: "GET",
        path: "/session/:id",
        auth: true,
        description: "Retrieve a chat session by ID",
        handler: async (req, res) => {
          const session = (await context.api.db.get(
            buildSessionKey(req.params.id),
          )) as ChatSession | null;
          if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
          }
          res.json(session);
        },
      });

      // DELETE /session/:id — delete a session
      context.api.registerEndpoint({
        method: "DELETE",
        path: "/session/:id",
        auth: true,
        description: "Delete a chat session",
        handler: async (req, res) => {
          const deleted = await context.api.db.delete(
            buildSessionKey(req.params.id),
          );
          if (!deleted) {
            res.status(404).json({ error: "Session not found" });
            return;
          }
          res.status(204).send("");
        },
      });
    },

    /**
     * conversation:start — create a session and mark it as active for this
     * app+user pair. The active key is used by subsequent hooks to look up the
     * session without scanning all keys.
     */
    "conversation:start": async (
      context: PluginContext,
      _conversation: { id?: string },
    ) => {
      const sessionId = generateSessionId();
      const session: ChatSession = {
        id: sessionId,
        appId: context.appId,
        userId: context.userId,
        messages: [],
        model: (context.api.getConfig("model") as string) ?? DEFAULT_MODEL,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await context.api.db.set(buildSessionKey(sessionId), session);
      await context.api.db.set(
        buildActiveKey(context.appId, context.userId),
        sessionId,
      );
      context.api.log(
        `Session created for user ${context.userId}: ${sessionId}`,
      );
    },

    /**
     * conversation:beforeMessage — append the incoming message to the active
     * session and trim the history to stay within the maxHistory limit.
     */
    "conversation:beforeMessage": async (
      context: PluginContext,
      message: { content?: string; role?: string },
    ) => {
      const sessionId = (await context.api.db.get(
        buildActiveKey(context.appId, context.userId),
      )) as string | null;
      if (!sessionId) return;

      const session = (await context.api.db.get(
        buildSessionKey(sessionId),
      )) as ChatSession | null;
      if (!session) return;

      const maxHistory =
        (context.api.getConfig("maxHistory") as number) ?? DEFAULT_MAX_HISTORY;

      const newMessage: ChatMessage = {
        role: (message.role as ChatMessage["role"]) ?? "user",
        content: message.content ?? "",
        ts: Date.now(),
      };

      const messages = trimMessages(
        [...session.messages, newMessage],
        maxHistory,
      );

      await context.api.db.set(buildSessionKey(sessionId), {
        ...session,
        messages,
        updatedAt: Date.now(),
      });
    },

    /**
     * conversation:end — stamp the session with the end time and remove the
     * active key so future messages start a fresh session.
     */
    "conversation:end": async (context: PluginContext) => {
      const sessionId = (await context.api.db.get(
        buildActiveKey(context.appId, context.userId),
      )) as string | null;
      if (!sessionId) return;

      const session = (await context.api.db.get(
        buildSessionKey(sessionId),
      )) as ChatSession | null;

      if (session) {
        await context.api.db.set(buildSessionKey(sessionId), {
          ...session,
          updatedAt: Date.now(),
        });
      }

      await context.api.db.delete(
        buildActiveKey(context.appId, context.userId),
      );
    },
  },

  // ── Filters ────────────────────────────────────────────────────────────────
  filters: {
    /**
     * prompt:modify — prepend the configured system prompt to every prompt
     * string, ensuring the LLM respects the widget's persona/instructions.
     */
    "prompt:modify": async (context: PluginContext, value: unknown) => {
      const systemPrompt =
        (context.api.getConfig("systemPrompt") as string) ?? "";
      if (systemPrompt && typeof value === "string" && value.trim()) {
        return `${systemPrompt}\n\n${value}`;
      }
      return value;
    },

    /**
     * response:modify — tag every object response with the widget identifier
     * so clients can distinguish widget-originated responses.
     */
    "response:modify": async (_context: PluginContext, value: unknown) => {
      if (value !== null && typeof value === "object") {
        return {
          ...(value as Record<string, unknown>),
          _widget: "ai-chat-widget",
        };
      }
      return value;
    },
  },
});
