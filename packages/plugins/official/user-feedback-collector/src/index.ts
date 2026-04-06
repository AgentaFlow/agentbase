/**
 * User Feedback Collector
 *
 * Captures thumbs-up / thumbs-down (or star) ratings after every AI response
 * and stores them for quality monitoring. No AI calls are needed — this plugin
 * is pure data collection.
 *
 * Key design decisions:
 * - `response:modify` injects `_feedbackEnabled: true` into every response so
 *   the frontend knows to render the rating widget.
 * - Ratings are stored per message: `feedback:{conversationId}:{messageIndex}`
 * - Daily stats keyed by `stats:daily:{date}:{model}` track avg rating + count
 *   with an incremental running-average update on every submission.
 * - `GET /export` streams CSV (no temp files, built inline).
 * - Stats `GET /stats` supports grouping by model, day, week, or month.
 *
 * @package @agentbase/plugin-user-feedback-collector
 * @version 1.0.0
 */
import { createPlugin } from "@agentbase/plugin-sdk";

// ── Constants ─────────────────────────────────────────────────────────────────

export const FEEDBACK_KEY_PREFIX = "feedback:";
export const STATS_KEY_PREFIX = "stats:daily:";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RatingType = "thumbs" | "stars" | "both";
export type ThumbsRating = "up" | "down";
export type StarsRating = 1 | 2 | 3 | 4 | 5;

export interface FeedbackRecord {
  conversationId: string;
  messageIndex: number;
  /** Numeric rating: 1 (thumbs-down) / 2 (thumbs-up) or 1–5 for stars. */
  rating: number;
  /** Raw value as submitted by user: "up" | "down" | 1-5. */
  rawRating: ThumbsRating | StarsRating;
  comment?: string;
  model?: string;
  userId?: string;
  timestamp: number;
}

export interface DailyModelStats {
  model: string;
  date: string;
  /** Running sum of all numeric ratings for the day. */
  ratingSum: number;
  /** Total feedback submissions. */
  count: number;
  /** Precomputed average: ratingSum / count. Updates on each submission. */
  avgRating: number;
}

export interface StatsGroupEntry {
  period: string;
  model: string;
  avgRating: number;
  count: number;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

export function buildFeedbackKey(
  conversationId: string,
  messageIndex: number,
): string {
  return `${FEEDBACK_KEY_PREFIX}${conversationId}:${messageIndex}`;
}

export function buildStatsKey(date: string, model: string): string {
  return `${STATS_KEY_PREFIX}${date}:${model}`;
}

export function todayUtc(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** ISO week number (1-53) for a date string "YYYY-MM-DD". */
export function isoWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const jan1 = new Date(`${d.getUTCFullYear()}-01-01T00:00:00Z`);
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86_400_000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** "YYYY-MM" month string. */
export function yearMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

// ── Rating Normalisation ──────────────────────────────────────────────────────

/**
 * Convert a raw user-supplied rating into a normalised numeric value.
 * - thumbs: "up" → 2, "down" → 1
 * - stars:  1–5 passed through as-is
 * Returns `null` when the value is invalid for the given type.
 */
export function normaliseRating(
  raw: unknown,
  feedbackType: RatingType,
): { numeric: number; raw: ThumbsRating | StarsRating } | null {
  if (feedbackType === "thumbs" || feedbackType === "both") {
    if (raw === "up") return { numeric: 2, raw: "up" as ThumbsRating };
    if (raw === "down") return { numeric: 1, raw: "down" as ThumbsRating };
  }
  if (feedbackType === "stars" || feedbackType === "both") {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= 5)
      return { numeric: n, raw: n as StarsRating };
  }
  return null;
}

// ── Stats Helpers ─────────────────────────────────────────────────────────────

/**
 * Incrementally update a DailyModelStats record with a new rating.
 * Returns the updated record (mutates in place for efficiency).
 */
export function updateStats(
  existing: DailyModelStats | null,
  model: string,
  date: string,
  numericRating: number,
): DailyModelStats {
  const rec: DailyModelStats = existing ?? {
    model,
    date,
    ratingSum: 0,
    count: 0,
    avgRating: 0,
  };
  rec.ratingSum += numericRating;
  rec.count += 1;
  rec.avgRating = rec.ratingSum / rec.count;
  return rec;
}

// ── CSV Builder ───────────────────────────────────────────────────────────────

export function buildCsvRow(record: FeedbackRecord): string {
  const escape = (v: unknown): string => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    escape(record.conversationId),
    escape(record.messageIndex),
    escape(record.rawRating),
    escape(record.rating),
    escape(record.comment ?? ""),
    escape(record.model ?? ""),
    escape(record.userId ?? ""),
    escape(new Date(record.timestamp).toISOString()),
  ].join(",");
}

export const CSV_HEADER =
  "conversationId,messageIndex,rawRating,numericRating,comment,model,userId,submittedAt";

// ── Plugin Definition ─────────────────────────────────────────────────────────

export default createPlugin({
  name: "user-feedback-collector",
  version: "1.0.0",
  description:
    "Thumbs up/down rating after each AI response with optional comments. Aggregated quality scores per model and time period.",
  permissions: ["db:readwrite"],
  settings: {
    enableAutoPrompt: {
      type: "boolean",
      label: "Automatically prompt for feedback after each response",
      default: true,
    },
    feedbackTypes: {
      type: "select",
      label: "Rating style",
      options: ["thumbs", "stars", "both"],
      default: "thumbs",
    },
    requireComment: {
      type: "boolean",
      label: "Require a comment with every rating",
      default: false,
    },
  },

  hooks: {
    "app:init": async (context) => {
      const { api } = context;

      // ── POST /feedback ──────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/feedback",
        auth: true,
        description: "Submit a rating (and optional comment) for a message",
        handler: async (req, res) => {
          const {
            conversationId,
            messageIndex,
            rating: rawRating,
            comment,
            model,
          } = req.body as {
            conversationId?: string;
            messageIndex?: number;
            rating?: unknown;
            comment?: string;
            model?: string;
          };

          if (!conversationId) {
            res.status(400).json({ error: "conversationId is required" });
            return;
          }
          if (messageIndex === undefined || messageIndex === null) {
            res.status(400).json({ error: "messageIndex is required" });
            return;
          }

          const feedbackType =
            (api.getConfig("feedbackTypes") as RatingType) ?? "thumbs";
          const normalized = normaliseRating(rawRating, feedbackType);
          if (!normalized) {
            res.status(400).json({
              error: `Invalid rating for feedback type '${feedbackType}'`,
            });
            return;
          }

          const requireComment =
            (api.getConfig("requireComment") as boolean) ?? false;
          if (requireComment && !comment?.trim()) {
            res.status(400).json({ error: "A comment is required" });
            return;
          }

          const record: FeedbackRecord = {
            conversationId,
            messageIndex,
            rating: normalized.numeric,
            rawRating: normalized.raw,
            comment: comment?.trim() ?? undefined,
            model: model ?? undefined,
            userId: context.userId ?? undefined,
            timestamp: Date.now(),
          };

          await api.db.set(
            buildFeedbackKey(conversationId, messageIndex),
            record,
          );

          // Update daily stats
          const date = todayUtc();
          const modelKey = model ?? "unknown";
          const statsKey = buildStatsKey(date, modelKey);
          const existing = (await api.db.get(
            statsKey,
          )) as DailyModelStats | null;
          const updated = updateStats(
            existing,
            modelKey,
            date,
            normalized.numeric,
          );
          await api.db.set(statsKey, updated);

          res.status(201).json({ ok: true, feedback: record });
        },
      });

      // ── GET /feedback ───────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/feedback",
        auth: true,
        description: "List feedback records with optional filters",
        handler: async (req, res) => {
          const {
            conversationId,
            model,
            from,
            to,
            limit: limitParam,
          } = req.query as Record<string, string | undefined>;
          const limit = Math.min(parseInt(limitParam ?? "50", 10) || 50, 200);

          const allKeys = await api.db.keys(FEEDBACK_KEY_PREFIX);
          const records = (
            await Promise.all(allKeys.map((k) => api.db.get(k)))
          ).filter((r): r is FeedbackRecord => r !== null);

          let filtered = records;
          if (conversationId) {
            filtered = filtered.filter(
              (r) => r.conversationId === conversationId,
            );
          }
          if (model) {
            filtered = filtered.filter((r) => r.model === model);
          }
          if (from) {
            const fromMs = new Date(from).getTime();
            if (!isNaN(fromMs)) {
              filtered = filtered.filter((r) => r.timestamp >= fromMs);
            }
          }
          if (to) {
            const toMs = new Date(to).getTime();
            if (!isNaN(toMs)) {
              filtered = filtered.filter((r) => r.timestamp <= toMs);
            }
          }

          filtered.sort((a, b) => b.timestamp - a.timestamp);
          res.status(200).json({
            feedback: filtered.slice(0, limit),
            total: filtered.length,
          });
        },
      });

      // ── GET /stats ──────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/stats",
        auth: true,
        description:
          "Aggregate quality scores — group by model, day, week, or month",
        handler: async (req, res) => {
          const { groupBy = "day", model: filterModel } = req.query as Record<
            string,
            string | undefined
          >;

          const allKeys = await api.db.keys(STATS_KEY_PREFIX);
          const records = (
            await Promise.all(allKeys.map((k) => api.db.get(k)))
          ).filter((r): r is DailyModelStats => r !== null);

          let filtered = records;
          if (filterModel) {
            filtered = filtered.filter((r) => r.model === filterModel);
          }

          // Re-aggregate by the requested grouping
          const buckets = new Map<
            string,
            { ratingSum: number; count: number; model: string }
          >();

          for (const rec of filtered) {
            let period: string;
            if (groupBy === "week") {
              period = isoWeek(rec.date);
            } else if (groupBy === "month") {
              period = yearMonth(rec.date);
            } else {
              period = rec.date; // default: day
            }

            const key = `${period}::${rec.model}`;
            const existing = buckets.get(key) ?? {
              ratingSum: 0,
              count: 0,
              model: rec.model,
            };
            existing.ratingSum += rec.ratingSum;
            existing.count += rec.count;
            buckets.set(key, existing);
          }

          const result: StatsGroupEntry[] = [...buckets.entries()].map(
            ([key, v]) => ({
              period: key.split("::")[0]!,
              model: v.model,
              avgRating: v.count > 0 ? v.ratingSum / v.count : 0,
              count: v.count,
            }),
          );

          result.sort((a, b) => b.period.localeCompare(a.period));
          res.status(200).json({ stats: result, groupBy });
        },
      });

      // ── GET /export ─────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/export",
        auth: true,
        description: "Download all feedback as a CSV file",
        handler: async (_req, res) => {
          const allKeys = await api.db.keys(FEEDBACK_KEY_PREFIX);
          const records = (
            await Promise.all(allKeys.map((k) => api.db.get(k)))
          ).filter((r): r is FeedbackRecord => r !== null);

          records.sort((a, b) => a.timestamp - b.timestamp);

          const lines = [CSV_HEADER, ...records.map((r) => buildCsvRow(r))];
          const csv = lines.join("\n");

          // Return as text/csv; handler sets headers via res.status().json() convention.
          // Well-behaved SDK implementations pass `headers` through — we use json-as-text
          // for SDK compatibility, wrapping in an object the frontend/SDK can detect.
          res.status(200).json({
            _csv: true,
            filename: `feedback-export-${todayUtc()}.csv`,
            contentType: "text/csv",
            data: csv,
          });
        },
      });
    },
  },

  filters: {
    "response:modify": async (_context, response) => {
      // Signal the frontend to render the feedback widget for this response.
      return {
        ...response,
        _feedbackEnabled: true,
      };
    },
  },
});
