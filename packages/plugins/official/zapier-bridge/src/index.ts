/**
 * Zapier Bridge
 *
 * Exposes Agentbase events as Zapier triggers using the REST Hooks standard
 * (instant delivery) and accepts inbound Zapier actions.
 *
 * REST Hooks pattern:
 * - Zapier POSTs to /subscribe when a user enables a Zap trigger.
 * - Agentbase immediately POSTs to the registered targetUrl whenever the
 *   subscribed event fires.
 * - Zapier DELETEs /subscribe/:hookId when the Zap is disabled.
 * - /events provides a polling fallback for the Zap editor's sample data.
 *
 * Inbound actions (/action):
 * - Zapier POSTs a JSON payload to /action. The `action` field selects the
 *   operation; the `data` field carries parameters.
 * - Protected by an optional per-plugin `actionSecret` header.
 *
 * @package @agentbase/plugin-zapier-bridge
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";
import { randomUUID } from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum number of events stored for the polling fallback endpoint. */
export const MAX_STORED_EVENTS = 100;

/** Event types that can be subscribed to as Zapier triggers. */
export const SUPPORTED_EVENTS = [
  "conversation.end",
  "user.register",
  "custom",
] as const;

export type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];

/** Actions that can be triggered inbound from Zapier. */
export const SUPPORTED_ACTIONS = [
  "send_message",
  "emit_event",
  "update_context",
] as const;

export type SupportedAction = (typeof SUPPORTED_ACTIONS)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HookRecord {
  hookId: string;
  targetUrl: string;
  event: string;
  createdAt: number;
}

export interface EventRecord {
  eventId: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface ZapierActionPayload {
  action: string;
  data: Record<string, unknown>;
  zapId?: string;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

export function buildHookKey(hookId: string): string {
  return `hook:${hookId}`;
}

export function buildEventKey(eventId: string): string {
  return `event:${eventId}`;
}

// ── ID Generation ─────────────────────────────────────────────────────────────

export function generateHookId(): string {
  return `hook_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function generateEventId(): string {
  return `evt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

// ── Event Storage ─────────────────────────────────────────────────────────────

/**
 * Prune stored events to keep only the most recent MAX_STORED_EVENTS entries.
 * Called after every new event is stored.
 */
export async function purgeOldEvents(
  dbGet: (key: string) => Promise<unknown>,
  dbDelete: (key: string) => Promise<boolean>,
  dbKeys: (prefix?: string) => Promise<string[]>,
): Promise<void> {
  const keys = await dbKeys("event:");
  if (keys.length <= MAX_STORED_EVENTS) return;

  const records = (
    await Promise.all(keys.map(async (k) => ({ key: k, rec: await dbGet(k) })))
  ).filter((x): x is { key: string; rec: EventRecord } => x.rec !== null);

  records.sort(
    (a, b) =>
      (a.rec as EventRecord).timestamp - (b.rec as EventRecord).timestamp,
  );

  const toDelete = records.slice(0, records.length - MAX_STORED_EVENTS);
  await Promise.all(toDelete.map(({ key }) => dbDelete(key)));
}

/**
 * Store an event for the polling fallback endpoint and fan out to all
 * matching REST Hook subscribers.
 *
 * The fan-out is fire-and-forget — delivery failures are logged but do not
 * affect the caller.
 */
export async function fanOutEvent(
  ctx: PluginContext,
  eventType: string,
  payload: unknown,
): Promise<void> {
  const { api } = ctx;

  // 1. Store event for polling fallback
  const eventId = generateEventId();
  const record: EventRecord = {
    eventId,
    type: eventType,
    payload,
    timestamp: Date.now(),
  };
  await api.db.set(buildEventKey(eventId), record);
  await purgeOldEvents(api.db.get, api.db.delete, api.db.keys);

  // 2. Collect matching subscribers
  const hookKeys = await api.db.keys("hook:");
  if (hookKeys.length === 0) return;

  const hooks = (await Promise.all(hookKeys.map((k) => api.db.get(k)))).filter(
    (h): h is HookRecord =>
      h !== null &&
      (h as HookRecord).targetUrl !== undefined &&
      ((h as HookRecord).event === eventType ||
        (h as HookRecord).event === "custom"),
  );

  // 3. Fan-out: fire-and-forget to each subscriber
  for (const hook of hooks) {
    (async () => {
      try {
        const response = await api.makeRequest(hook.targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: record.eventId,
            type: eventType,
            data: payload,
            timestamp: record.timestamp,
          }),
        });
        if (!response.ok) {
          api.log(
            `Zapier fan-out to ${hook.targetUrl} failed: HTTP ${response.status}`,
            "warn",
          );
        }
      } catch (err) {
        api.log(
          `Zapier fan-out delivery error for hook ${hook.hookId}: ${(err as Error).message}`,
          "error",
        );
      }
    })();
  }
}

// ── Plugin Definition ─────────────────────────────────────────────────────────

export default createPlugin({
  name: "zapier-bridge",
  version: "1.0.0",
  description:
    "Expose Agentbase events as Zapier triggers and accept inbound Zapier actions, connecting your AI app to 7,000+ integrations.",
  permissions: ["network:external", "db:readwrite"],
  settings: {
    enableTriggers: {
      type: "boolean",
      label: "Enable Zapier Triggers",
      default: true,
    },
    enableActions: {
      type: "boolean",
      label: "Enable Inbound Zapier Actions",
      default: true,
    },
    allowedActions: {
      type: "string",
      label:
        "Allowed Inbound Actions (comma-separated: send_message, emit_event, update_context)",
      default: "send_message,emit_event",
    },
    actionSecret: {
      type: "string",
      label: "Action Endpoint Secret (optional — sent as X-Zapier-Secret)",
      encrypted: true,
    },
  },

  hooks: {
    "app:init": async (context) => {
      const { api } = context;

      // ── POST /subscribe ─────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/subscribe",
        auth: true,
        description: "Register a Zapier REST Hook subscription",
        handler: async (req, res) => {
          const enableTriggers =
            (api.getConfig("enableTriggers") as boolean) ?? true;
          if (!enableTriggers) {
            res.status(403).json({ error: "Triggers are disabled" });
            return;
          }

          const { targetUrl, event } = req.body as {
            targetUrl?: string;
            event?: string;
          };

          if (!targetUrl || typeof targetUrl !== "string") {
            res.status(400).json({ error: "targetUrl is required" });
            return;
          }
          if (!event || typeof event !== "string") {
            res.status(400).json({ error: "event is required" });
            return;
          }
          if (
            !(SUPPORTED_EVENTS as readonly string[]).includes(event) &&
            event !== "custom"
          ) {
            res.status(400).json({
              error: `Unsupported event '${event}'. Supported: ${SUPPORTED_EVENTS.join(", ")}`,
            });
            return;
          }

          const hookId = generateHookId();
          const hook: HookRecord = {
            hookId,
            targetUrl,
            event,
            createdAt: Date.now(),
          };
          await api.db.set(buildHookKey(hookId), hook);

          res.status(201).json({ id: hookId, event, targetUrl });
        },
      });

      // ── DELETE /subscribe/:hookId ───────────────────────────────────────────
      api.registerEndpoint({
        method: "DELETE",
        path: "/subscribe/:hookId",
        auth: true,
        description: "Unregister a Zapier REST Hook subscription",
        handler: async (req, res) => {
          const hookId = req.params?.["hookId"] as string | undefined;
          if (!hookId) {
            res.status(400).json({ error: "hookId is required" });
            return;
          }

          const existing = await api.db.get(buildHookKey(hookId));
          if (!existing) {
            res.status(404).json({ error: "Hook not found" });
            return;
          }

          await api.db.delete(buildHookKey(hookId));
          res.status(200).json({ deleted: true, hookId });
        },
      });

      // ── GET /subscribe ──────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/subscribe",
        auth: true,
        description: "List all active Zapier REST Hook subscriptions",
        handler: async (_req, res) => {
          const hookKeys = await api.db.keys("hook:");
          const hooks = (
            await Promise.all(hookKeys.map((k) => api.db.get(k)))
          ).filter((h): h is HookRecord => h !== null);

          res.status(200).json({ hooks });
        },
      });

      // ── POST /action ────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/action",
        auth: false,
        description: "Accept an inbound action from Zapier",
        handler: async (req, res) => {
          const enableActions =
            (api.getConfig("enableActions") as boolean) ?? true;
          if (!enableActions) {
            res.status(403).json({ error: "Inbound actions are disabled" });
            return;
          }

          // Verify optional action secret
          const configuredSecret =
            (api.getConfig("actionSecret") as string) ?? "";
          if (configuredSecret) {
            const providedSecret = req.headers["x-zapier-secret"] as
              | string
              | undefined;
            if (!providedSecret || providedSecret !== configuredSecret) {
              res.status(401).json({ error: "Invalid or missing secret" });
              return;
            }
          }

          const payload = req.body as ZapierActionPayload;
          if (!payload.action || typeof payload.action !== "string") {
            res.status(400).json({ error: "action field is required" });
            return;
          }
          if (!payload.data || typeof payload.data !== "object") {
            res.status(400).json({ error: "data field is required" });
            return;
          }

          const allowedActions = (
            (api.getConfig("allowedActions") as string | undefined) ??
            "send_message,emit_event"
          )
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (!allowedActions.includes(payload.action)) {
            res.status(403).json({
              error: `Action '${payload.action}' is not in the allowed actions list`,
            });
            return;
          }

          switch (payload.action as SupportedAction) {
            case "send_message": {
              const { message, userId } = payload.data as {
                message?: string;
                userId?: string;
              };
              if (!message || typeof message !== "string") {
                res
                  .status(400)
                  .json({ error: "data.message is required for send_message" });
                return;
              }
              await api.events.emit("zapier:send_message", {
                message,
                userId,
                zapId: payload.zapId,
              });
              res.status(200).json({ ok: true, action: "send_message" });
              return;
            }

            case "emit_event": {
              const { eventName, eventData } = payload.data as {
                eventName?: string;
                eventData?: unknown;
              };
              if (!eventName || typeof eventName !== "string") {
                res
                  .status(400)
                  .json({ error: "data.eventName is required for emit_event" });
                return;
              }
              await api.events.emit(`zapier:${eventName}`, {
                data: eventData,
                zapId: payload.zapId,
              });
              res
                .status(200)
                .json({ ok: true, action: "emit_event", eventName });
              return;
            }

            case "update_context": {
              const { key, value } = payload.data as {
                key?: string;
                value?: unknown;
              };
              if (!key || typeof key !== "string") {
                res
                  .status(400)
                  .json({ error: "data.key is required for update_context" });
                return;
              }
              await api.events.emit("zapier:update_context", {
                key,
                value,
                zapId: payload.zapId,
              });
              res.status(200).json({ ok: true, action: "update_context", key });
              return;
            }

            default:
              res
                .status(400)
                .json({ error: `Unknown action '${payload.action}'` });
          }
        },
      });

      // ── GET /events ─────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/events",
        auth: false,
        description:
          "Polling fallback — return up to 100 recent events for Zapier sample data",
        handler: async (req, res) => {
          const eventType = req.query?.["type"] as string | undefined;
          const limitParam = req.query?.["limit"] as string | undefined;
          const limit = Math.min(
            parseInt(limitParam ?? "25", 10) || 25,
            MAX_STORED_EVENTS,
          );

          const eventKeys = await api.db.keys("event:");
          const events = (
            await Promise.all(eventKeys.map((k) => api.db.get(k)))
          ).filter((e): e is EventRecord => e !== null);

          const filtered = eventType
            ? events.filter((e) => e.type === eventType)
            : events;
          filtered.sort((a, b) => b.timestamp - a.timestamp);

          res.status(200).json({ events: filtered.slice(0, limit) });
        },
      });
    },

    // ── conversation:end ─────────────────────────────────────────────────────
    "conversation:end": async (context) => {
      const enableTriggers =
        (context.api.getConfig("enableTriggers") as boolean) ?? true;
      if (!enableTriggers) return;
      await fanOutEvent(context, "conversation.end", {
        appId: context.appId,
        userId: context.userId,
        conversationId: (context as unknown as Record<string, unknown>)[
          "conversationId"
        ],
        timestamp: Date.now(),
      });
    },

    // ── user:register ────────────────────────────────────────────────────────
    "user:register": async (context) => {
      const enableTriggers =
        (context.api.getConfig("enableTriggers") as boolean) ?? true;
      if (!enableTriggers) return;
      await fanOutEvent(context, "user.register", {
        appId: context.appId,
        userId: context.userId,
        timestamp: Date.now(),
      });
    },
  },
});
