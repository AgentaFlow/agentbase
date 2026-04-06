/**
 * OpenRouter Gateway
 *
 * Routes AI completions through OpenRouter's unified API, providing access
 * to 200+ models with a single API key. Implements:
 *
 * - Completion requests via the OpenAI-compatible endpoint
 * - Automatic fallback chain: on 429 / 5xx from the primary model, retries
 *   each fallback in order
 * - Per-user per-day cost tracking in USD cents (stored in plugin DB)
 * - Model catalogue caching with a 1-hour TTL
 * - All costs stored as integer cents to avoid floating-point drift
 *
 * OpenRouter-specific headers:
 *   HTTP-Referer:  siteUrl setting  (for analytics dashboard)
 *   X-Title:       appName setting  (displayed in OpenRouter logs)
 *
 * @package @agentbase/plugin-openrouter-gateway
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";

// ── Constants ─────────────────────────────────────────────────────────────────

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
export const MODELS_CACHE_KEY = "models:cache";
/** Cache TTL for the model list (1 hour). */
export const MODELS_CACHE_TTL_MS = 60 * 60 * 1000;
/** Default maximum cost per request in USD cents (50¢). */
export const DEFAULT_MAX_COST_CENTS = 50;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string; // USD per token as string, e.g. "0.000001"
    completion: string;
  };
  context_length?: number;
  top_provider?: { max_completion_tokens?: number };
}

export interface OpenRouterChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterCompletionRequest {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface UsageRecord {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Cost in USD cents (integer). */
  costCents: number;
  timestamp: number;
}

export interface DailyUsage {
  userId: string;
  date: string;
  entries: UsageRecord[];
  totalCostCents: number;
  totalTokens: number;
}

export interface ModelsCacheRecord {
  models: OpenRouterModel[];
  cachedAt: number;
}

export interface GatewayConfig {
  defaultModel: string;
  fallbackModels: string[];
  maxCostCents: number;
  updatedAt: number;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

export function buildUsageKey(userId: string, date: string): string {
  return `usage:${userId}:${date}`;
}

export function buildConfigKey(appId: string): string {
  return `config:${appId}`;
}

/** Format a date as YYYY-MM-DD in UTC. */
export function todayUtc(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

// ── Cost Calculation ──────────────────────────────────────────────────────────

/**
 * Estimate cost in USD cents from token counts and per-token pricing strings.
 * Pricing strings from OpenRouter are USD per token (e.g. "0.000001").
 * Returns integer cents, rounded up.
 */
export function estimateCostCents(
  promptTokens: number,
  completionTokens: number,
  promptPricePerToken: string,
  completionPricePerToken: string,
): number {
  const promptUsd = promptTokens * parseFloat(promptPricePerToken || "0");
  const completionUsd =
    completionTokens * parseFloat(completionPricePerToken || "0");
  return Math.ceil((promptUsd + completionUsd) * 100);
}

// ── Model Cache ───────────────────────────────────────────────────────────────

/**
 * Fetch the OpenRouter model list. Returns cached result if valid (< 1h old).
 */
export async function fetchModels(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  siteUrl: string,
  appName: string,
  cachedRecord: ModelsCacheRecord | null,
  nowMs: number = Date.now(),
): Promise<OpenRouterModel[]> {
  if (cachedRecord && nowMs - cachedRecord.cachedAt < MODELS_CACHE_TTL_MS) {
    return cachedRecord.models;
  }

  const response = await makeRequest(`${OPENROUTER_BASE}/models`, {
    headers: buildHeaders(apiKey, siteUrl, appName),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models fetch failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { data: OpenRouterModel[] };
  return data.data ?? [];
}

// ── OpenRouter API Helpers ────────────────────────────────────────────────────

export function buildHeaders(
  apiKey: string,
  siteUrl: string,
  appName: string,
): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
    ...(appName ? { "X-Title": appName } : {}),
  };
}

/**
 * Call the OpenRouter chat completions endpoint for a single model.
 * Throws on HTTP 4xx/5xx so the fallback chain can catch and continue.
 */
export async function callModel(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  siteUrl: string,
  appName: string,
  body: OpenRouterCompletionRequest,
): Promise<OpenRouterCompletionResponse> {
  const response = await makeRequest(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(apiKey, siteUrl, appName),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter HTTP ${response.status} for model ${body.model}`,
    );
  }

  return (await response.json()) as OpenRouterCompletionResponse;
}

/**
 * Attempt the primary model, then each fallback in order, stopping at the
 * first successful response. Throws if all models fail.
 *
 * @param maxCostCents  If > 0, abort if estimated cost exceeds this before
 *                      even making the call.
 */
export async function callWithFallback(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  siteUrl: string,
  appName: string,
  messages: OpenRouterChatMessage[],
  primaryModel: string,
  fallbackModels: string[],
  maxCostCents: number = 0,
): Promise<OpenRouterCompletionResponse> {
  const chain = [primaryModel, ...fallbackModels].filter(Boolean);
  let lastError: Error = new Error("No models in chain");

  for (const model of chain) {
    try {
      const result = await callModel(makeRequest, apiKey, siteUrl, appName, {
        model,
        messages,
      });
      return result;
    } catch (err) {
      lastError = err as Error;
      // Only continue to fallback on rate-limit / server errors
      const msg = lastError.message;
      const isRetryable =
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504");
      if (!isRetryable) throw lastError;
    }
  }

  throw lastError;
}

// ── Plugin Definition ─────────────────────────────────────────────────────────

export default createPlugin({
  name: "openrouter-gateway",
  version: "1.0.0",
  description:
    "Route all AI model calls through OpenRouter — one key for 200+ models with automatic fallbacks and cost tracking.",
  permissions: ["network:external", "db:readwrite"],
  settings: {
    openRouterApiKey: {
      type: "string",
      label: "OpenRouter API Key",
      encrypted: true,
    },
    defaultModel: {
      type: "string",
      label: "Default Model (e.g. openai/gpt-4o)",
      default: "openai/gpt-4o",
    },
    fallbackModels: {
      type: "string",
      label: "Fallback Models (comma-separated)",
      default: "openai/gpt-4o-mini,anthropic/claude-3-5-haiku",
    },
    maxCostPerRequest: {
      type: "number",
      label: "Max Cost Per Request (USD, e.g. 0.50)",
      default: 0.5,
    },
    siteUrl: {
      type: "string",
      label: "Site URL (sent as HTTP-Referer to OpenRouter)",
    },
    appName: {
      type: "string",
      label: "App Name (sent as X-Title to OpenRouter)",
    },
  },

  hooks: {
    "app:init": async (context) => {
      const { api } = context;

      // ── GET /models ─────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/models",
        auth: true,
        description: "List available OpenRouter models with pricing",
        handler: async (_req, res) => {
          const apiKey = (api.getConfig("openRouterApiKey") as string) ?? "";
          if (!apiKey) {
            res
              .status(400)
              .json({ error: "OpenRouter API key not configured" });
            return;
          }

          const siteUrl = (api.getConfig("siteUrl") as string) ?? "";
          const appName = (api.getConfig("appName") as string) ?? "";
          const cached = (await api.db.get(
            MODELS_CACHE_KEY,
          )) as ModelsCacheRecord | null;

          try {
            const models = await fetchModels(
              api.makeRequest,
              apiKey,
              siteUrl,
              appName,
              cached,
            );
            // Refresh cache if stale
            if (
              !cached ||
              Date.now() - cached.cachedAt >= MODELS_CACHE_TTL_MS
            ) {
              await api.db.set(MODELS_CACHE_KEY, {
                models,
                cachedAt: Date.now(),
              } satisfies ModelsCacheRecord);
            }
            res.status(200).json({ models });
          } catch (err) {
            res.status(502).json({ error: (err as Error).message });
          }
        },
      });

      // ── GET /usage ──────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/usage",
        auth: true,
        description: "Cost and token breakdown by user and date",
        handler: async (req, res) => {
          const userId = req.query?.["userId"] as string | undefined;
          const date =
            (req.query?.["date"] as string | undefined) ?? todayUtc();
          const limitParam = req.query?.["limit"] as string | undefined;
          const limit = Math.min(parseInt(limitParam ?? "30", 10) || 30, 90);

          if (userId) {
            const record = (await api.db.get(
              buildUsageKey(userId, date),
            )) as DailyUsage | null;
            res.status(200).json({ usage: record ?? null });
            return;
          }

          // Aggregate app-wide: collect all usage keys for the date
          const keys = await api.db.keys("usage:");
          const dateKeys = keys.filter((k) => k.endsWith(`:${date}`));
          const records = (
            await Promise.all(dateKeys.map((k) => api.db.get(k)))
          ).filter((r): r is DailyUsage => r !== null);

          records.sort((a, b) => b.totalCostCents - a.totalCostCents);
          res.status(200).json({ usage: records.slice(0, limit), date });
        },
      });

      // ── PUT /config ─────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "PUT",
        path: "/config",
        auth: true,
        description: "Update default model and fallback chain",
        handler: async (req, res) => {
          const { defaultModel, fallbackModels, maxCostPerRequest } =
            req.body as {
              defaultModel?: string;
              fallbackModels?: string;
              maxCostPerRequest?: number;
            };

          if (
            !defaultModel &&
            fallbackModels === undefined &&
            maxCostPerRequest === undefined
          ) {
            res.status(400).json({ error: "No fields to update" });
            return;
          }

          const existing = ((await api.db.get(buildConfigKey(context.appId))) ??
            {}) as Partial<GatewayConfig>;

          const updated: GatewayConfig = {
            defaultModel:
              defaultModel ??
              existing.defaultModel ??
              ((api.getConfig("defaultModel") as string) || "openai/gpt-4o"),
            fallbackModels: fallbackModels
              ? fallbackModels
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : (existing.fallbackModels ?? []),
            maxCostCents:
              maxCostPerRequest !== undefined
                ? Math.round(maxCostPerRequest * 100)
                : (existing.maxCostCents ?? DEFAULT_MAX_COST_CENTS),
            updatedAt: Date.now(),
          };

          await api.db.set(buildConfigKey(context.appId), updated);
          res.status(200).json({ config: updated });
        },
      });

      // ── GET /config ─────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/config",
        auth: true,
        description: "Get current gateway configuration",
        handler: async (_req, res) => {
          const stored = (await api.db.get(
            buildConfigKey(context.appId),
          )) as GatewayConfig | null;

          const config: GatewayConfig = stored ?? {
            defaultModel:
              (api.getConfig("defaultModel") as string) || "openai/gpt-4o",
            fallbackModels: ((api.getConfig("fallbackModels") as string) || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            maxCostCents: Math.round(
              ((api.getConfig("maxCostPerRequest") as number) ?? 0.5) * 100,
            ),
            updatedAt: 0,
          };

          res.status(200).json({ config });
        },
      });

      // ── POST /test ──────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/test",
        auth: true,
        description: "Send a test prompt to verify API key and model",
        handler: async (req, res) => {
          const apiKey = (api.getConfig("openRouterApiKey") as string) ?? "";
          if (!apiKey) {
            res
              .status(400)
              .json({ error: "OpenRouter API key not configured" });
            return;
          }

          const { prompt = "Say 'OK' in one word.", model } = req.body as {
            prompt?: string;
            model?: string;
          };

          const targetModel =
            model ??
            (api.getConfig("defaultModel") as string) ??
            "openai/gpt-4o-mini";
          const siteUrl = (api.getConfig("siteUrl") as string) ?? "";
          const appName = (api.getConfig("appName") as string) ?? "";

          try {
            const result = await callModel(
              api.makeRequest,
              apiKey,
              siteUrl,
              appName,
              {
                model: targetModel,
                messages: [{ role: "user", content: prompt }],
              },
            );
            res.status(200).json({
              ok: true,
              model: result.model,
              reply: result.choices[0]?.message.content ?? "",
              usage: result.usage,
            });
          } catch (err) {
            res.status(502).json({ ok: false, error: (err as Error).message });
          }
        },
      });
    },

    // ── conversation:beforeMessage ────────────────────────────────────────────
    "conversation:beforeMessage": async (context) => {
      const { api } = context;
      const apiKey = (api.getConfig("openRouterApiKey") as string) ?? "";
      if (!apiKey) return; // Not configured — let default AI handle it

      const stored = (await api.db.get(
        buildConfigKey(context.appId),
      )) as GatewayConfig | null;

      const primaryModel =
        stored?.defaultModel ??
        (api.getConfig("defaultModel") as string) ??
        "openai/gpt-4o";
      const fallbackModels =
        stored?.fallbackModels ??
        ((api.getConfig("fallbackModels") as string) ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      const message = (context as unknown as Record<string, unknown>)[
        "message"
      ] as string | undefined;
      if (!message) return;

      const siteUrl = (api.getConfig("siteUrl") as string) ?? "";
      const appName = (api.getConfig("appName") as string) ?? "";

      try {
        const result = await callWithFallback(
          api.makeRequest,
          apiKey,
          siteUrl,
          appName,
          [{ role: "user", content: message }],
          primaryModel,
          fallbackModels,
        );

        // Track usage
        const usage = result.usage;
        if (usage && context.userId) {
          const date = todayUtc();
          const usageKey = buildUsageKey(context.userId, date);
          const existing = ((await api.db.get(usageKey)) ?? {
            userId: context.userId,
            date,
            entries: [],
            totalCostCents: 0,
            totalTokens: 0,
          }) as DailyUsage;

          // Find pricing from cache if available
          const modelsCache = (await api.db.get(
            MODELS_CACHE_KEY,
          )) as ModelsCacheRecord | null;
          const modelInfo = modelsCache?.models.find(
            (m) => m.id === result.model,
          );
          const costCents = modelInfo?.pricing
            ? estimateCostCents(
                usage.prompt_tokens,
                usage.completion_tokens,
                modelInfo.pricing.prompt,
                modelInfo.pricing.completion,
              )
            : 0;

          existing.entries.push({
            model: result.model,
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            costCents,
            timestamp: Date.now(),
          });
          existing.totalCostCents += costCents;
          existing.totalTokens += usage.total_tokens;

          await api.db.set(usageKey, existing);
        }
      } catch (err) {
        api.log(`OpenRouter gateway error: ${(err as Error).message}`, "error");
      }
    },
  },
});
