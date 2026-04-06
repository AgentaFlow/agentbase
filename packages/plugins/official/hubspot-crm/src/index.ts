/**
 * HubSpot CRM
 *
 * Enrich HubSpot CRM contacts with AI conversation summaries. Auto-log
 * interactions, update deal stages, and generate lead scores from chat data.
 *
 * All external HubSpot requests use `makeRequest` with Bearer-token auth
 * (Private App Token). The AI enrichment summary is generated via the
 * platform's internal AI service.
 *
 * Plugin DB keys:
 *  - `connection:config`                    — stored HubSpot API key + metadata
 *  - `contact:{hubspotId}:{conversationId}` — logged interaction record
 *  - `enrichment:{contactId}`               — latest AI enrichment record
 *  - `pending:{conversationId}`             — queued conversation awaiting link
 *  - `association:{conversationId}`         — maps conversationId → hubspotContactId
 *
 * @package @agentbase/plugin-hubspot-crm
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";

// ── Constants ─────────────────────────────────────────────────────────────────

export const HUBSPOT_API_BASE = "https://api.hubapi.com";
export const AI_COMPLETIONS_PATH = "/api/v1/internal/ai/completions";
export const CONNECTION_KEY = "connection:config";
export const DEFAULT_ENRICH_MODEL = "gpt-4o-mini";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HubSpotContactProperties {
  firstname?: string;
  lastname?: string;
  email?: string;
  company?: string;
  phone?: string;
}

export interface HubSpotContact {
  id: string;
  properties: HubSpotContactProperties;
}

export interface HubSpotDealProperties {
  dealname?: string;
  dealstage?: string;
  pipeline?: string;
  amount?: string;
  closedate?: string;
}

export interface HubSpotDeal {
  id: string;
  properties: HubSpotDealProperties;
}

export interface HubSpotNote {
  id: string;
  properties: {
    hs_note_body: string;
    hs_timestamp: string;
  };
}

export interface HubSpotListResult<T> {
  results: T[];
  paging?: {
    next?: { after: string };
  };
}

export interface HubSpotSearchResult<T> {
  results: T[];
  total: number;
}

export interface ContactInteractionRecord {
  hubspotContactId: string;
  conversationId: string;
  userId: string;
  noteId?: string;
  loggedAt: number;
}

export interface EnrichmentRecord {
  contactId: string;
  summary: string;
  model: string;
  generatedAt: number;
}

export interface PendingInteractionRecord {
  conversationId: string;
  userId: string;
  queuedAt: number;
}

export interface ConnectionConfig {
  apiKey: string;
  connectedAt: number;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

export function buildContactKey(
  hubspotId: string,
  conversationId: string,
): string {
  return `contact:${hubspotId}:${conversationId}`;
}

export function buildEnrichmentKey(contactId: string): string {
  return `enrichment:${contactId}`;
}

export function buildPendingKey(conversationId: string): string {
  return `pending:${conversationId}`;
}

export function buildAssociationKey(conversationId: string): string {
  return `association:${conversationId}`;
}

// ── HubSpot API Helpers ───────────────────────────────────────────────────────

/**
 * Generic HubSpot REST API request with Bearer-token (Private App) auth.
 * Throws on non-2xx responses.
 */
export async function hubspotRequest<T>(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await makeRequest(`${HUBSPOT_API_BASE}${path}`, init);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `HubSpot API error ${response.status}: ${text || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Search HubSpot contacts by a query string using the v3 search API.
 */
export async function searchContacts(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  query: string,
  limit = 20,
): Promise<HubSpotContact[]> {
  const result = await hubspotRequest<HubSpotSearchResult<HubSpotContact>>(
    makeRequest,
    apiKey,
    "POST",
    "/crm/v3/objects/contacts/search",
    {
      query,
      limit,
      properties: ["firstname", "lastname", "email", "company", "phone"],
    },
  );
  return result.results;
}

/**
 * Get a single HubSpot contact by ID with standard properties.
 */
export async function getContact(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  contactId: string,
): Promise<HubSpotContact> {
  return hubspotRequest<HubSpotContact>(
    makeRequest,
    apiKey,
    "GET",
    `/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,company,phone`,
  );
}

/**
 * List HubSpot deals, optionally filtered client-side by pipeline ID.
 */
export async function getDeals(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  pipelineId?: string,
  limit = 20,
): Promise<HubSpotDeal[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    properties: "dealname,dealstage,pipeline,amount,closedate",
  });

  const result = await hubspotRequest<HubSpotListResult<HubSpotDeal>>(
    makeRequest,
    apiKey,
    "GET",
    `/crm/v3/objects/deals?${params.toString()}`,
  );

  if (pipelineId) {
    return result.results.filter((d) => d.properties.pipeline === pipelineId);
  }

  return result.results;
}

/**
 * Create a Note engagement object in HubSpot.
 */
export async function createNote(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  noteBody: string,
): Promise<HubSpotNote> {
  return hubspotRequest<HubSpotNote>(
    makeRequest,
    apiKey,
    "POST",
    "/crm/v3/objects/notes",
    {
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: new Date().toISOString(),
      },
    },
  );
}

/**
 * Associate a Note with a Contact via the v3 associations batch API.
 */
export async function associateNoteWithContact(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  noteId: string,
  contactId: string,
): Promise<void> {
  await hubspotRequest<unknown>(
    makeRequest,
    apiKey,
    "POST",
    "/crm/v3/associations/notes/contacts/batch/create",
    {
      inputs: [
        {
          from: { id: noteId },
          to: { id: contactId },
          type: "note_to_contact",
        },
      ],
    },
  );
}

/**
 * Update the stage of a HubSpot deal via PATCH.
 */
export async function updateDealStage(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  dealId: string,
  stage: string,
): Promise<HubSpotDeal> {
  return hubspotRequest<HubSpotDeal>(
    makeRequest,
    apiKey,
    "PATCH",
    `/crm/v3/objects/deals/${dealId}`,
    { properties: { dealstage: stage } },
  );
}

// ── AI Enrichment ─────────────────────────────────────────────────────────────

/**
 * Generate a one-paragraph CRM enrichment summary from conversation text
 * using the platform's internal AI service.
 */
export async function generateEnrichmentSummary(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  conversationText: string,
  model: string = DEFAULT_ENRICH_MODEL,
): Promise<string> {
  const prompt = `You are a CRM assistant. Based on the following AI conversation, write a concise one-paragraph summary suitable for a HubSpot contact note. Focus on the user's intent, key information shared, and any required follow-up actions.\n\nConversation:\n${conversationText}`;

  const response = await makeRequest(AI_COMPLETIONS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
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

// ── Plugin ────────────────────────────────────────────────────────────────────

export default createPlugin({
  name: "hubspot-crm",
  version: "1.0.0",
  description:
    "Enrich HubSpot CRM contacts with AI conversation summaries. Auto-log interactions, update deal stages, and generate lead scores from chat data.",
  permissions: ["network:external", "db:readwrite"],

  settings: {
    hubspotApiKey: {
      type: "string",
      label: "HubSpot Private App Token",
      encrypted: true,
    },
    autoLogConversations: {
      type: "boolean",
      label: "Automatically log conversations to HubSpot contact timelines",
      default: true,
    },
    enrichModel: {
      type: "select",
      label: "AI Model for Contact Enrichment",
      default: DEFAULT_ENRICH_MODEL,
      options: [
        "gpt-4o-mini",
        "gpt-4o",
        "claude-3-5-haiku",
        "claude-3-5-sonnet",
      ],
    },
    pipelineId: {
      type: "string",
      label: "HubSpot Pipeline ID (optional — used to filter deals)",
    },
  },

  hooks: {
    // ── app:init ─────────────────────────────────────────────────────────────
    "app:init": async (context: PluginContext) => {
      const { api } = context;

      // ── POST /connect ───────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/connect",
        auth: true,
        description: "Validate and store HubSpot Private App Token",
        handler: async (req, res) => {
          const { apiKey } = req.body as { apiKey?: string };

          if (!apiKey) {
            res.status(400).json({ error: "apiKey is required" });
            return;
          }

          // Validate by fetching one contact — cheap read operation
          try {
            await hubspotRequest<unknown>(
              api.makeRequest,
              apiKey,
              "GET",
              "/crm/v3/objects/contacts?limit=1",
            );
          } catch (err) {
            res.status(400).json({
              error: `Invalid API key: ${(err as Error).message}`,
            });
            return;
          }

          const config: ConnectionConfig = { apiKey, connectedAt: Date.now() };
          await api.db.set(CONNECTION_KEY, config);
          res.status(200).json({ connected: true });
        },
      });

      // ── GET /contacts ───────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/contacts",
        auth: true,
        description: "Search HubSpot contacts by query string",
        handler: async (req, res) => {
          const apiKey = (api.getConfig("hubspotApiKey") as string) ?? "";
          if (!apiKey) {
            res.status(400).json({ error: "HubSpot API key not configured" });
            return;
          }

          const q = req.query["q"] ?? "";
          const limit = Math.min(
            parseInt(req.query["limit"] ?? "20", 10) || 20,
            100,
          );

          try {
            const contacts = await searchContacts(
              api.makeRequest,
              apiKey,
              q,
              limit,
            );
            res.status(200).json({ contacts });
          } catch (err) {
            res.status(502).json({ error: (err as Error).message });
          }
        },
      });

      // ── GET /contacts/:id ───────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/contacts/:id",
        auth: true,
        description: "Get a single HubSpot contact by ID",
        handler: async (req, res) => {
          const apiKey = (api.getConfig("hubspotApiKey") as string) ?? "";
          if (!apiKey) {
            res.status(400).json({ error: "HubSpot API key not configured" });
            return;
          }

          const { id } = req.params;

          try {
            const contact = await getContact(api.makeRequest, apiKey, id);
            res.status(200).json({ contact });
          } catch (err) {
            const msg = (err as Error).message;
            if (msg.includes("404")) {
              res.status(404).json({ error: "Contact not found" });
            } else {
              res.status(502).json({ error: msg });
            }
          }
        },
      });

      // ── POST /contacts/:id/enrich ───────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/contacts/:id/enrich",
        auth: true,
        description:
          "Generate an AI summary from conversation text and add it as a HubSpot note",
        handler: async (req, res) => {
          const apiKey = (api.getConfig("hubspotApiKey") as string) ?? "";
          if (!apiKey) {
            res.status(400).json({ error: "HubSpot API key not configured" });
            return;
          }

          const { id: contactId } = req.params;
          const { conversationText, conversationId } = req.body as {
            conversationText?: string;
            conversationId?: string;
          };

          if (!conversationText) {
            res.status(400).json({ error: "conversationText is required" });
            return;
          }

          const model =
            (api.getConfig("enrichModel") as string) ?? DEFAULT_ENRICH_MODEL;

          try {
            const summary = await generateEnrichmentSummary(
              api.makeRequest,
              conversationText,
              model,
            );

            const note = await createNote(api.makeRequest, apiKey, summary);
            await associateNoteWithContact(
              api.makeRequest,
              apiKey,
              note.id,
              contactId,
            );

            const enrichmentRecord: EnrichmentRecord = {
              contactId,
              summary,
              model,
              generatedAt: Date.now(),
            };
            await api.db.set(buildEnrichmentKey(contactId), enrichmentRecord);

            if (conversationId) {
              const interaction: ContactInteractionRecord = {
                hubspotContactId: contactId,
                conversationId,
                userId: "",
                noteId: note.id,
                loggedAt: Date.now(),
              };
              await api.db.set(
                buildContactKey(contactId, conversationId),
                interaction,
              );
            }

            res.status(200).json({ summary, noteId: note.id });
          } catch (err) {
            res.status(502).json({ error: (err as Error).message });
          }
        },
      });

      // ── GET /deals ──────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/deals",
        auth: true,
        description: "List HubSpot deals, optionally filtered by pipeline",
        handler: async (req, res) => {
          const apiKey = (api.getConfig("hubspotApiKey") as string) ?? "";
          if (!apiKey) {
            res.status(400).json({ error: "HubSpot API key not configured" });
            return;
          }

          const limit = Math.min(
            parseInt(req.query["limit"] ?? "20", 10) || 20,
            100,
          );
          const pipelineId =
            req.query["pipelineId"] ||
            (api.getConfig("pipelineId") as string) ||
            undefined;

          try {
            const deals = await getDeals(
              api.makeRequest,
              apiKey,
              pipelineId,
              limit,
            );
            res.status(200).json({ deals });
          } catch (err) {
            res.status(502).json({ error: (err as Error).message });
          }
        },
      });

      // ── POST /deals/:id/update-stage ────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/deals/:id/update-stage",
        auth: true,
        description: "Update the stage of a HubSpot deal",
        handler: async (req, res) => {
          const apiKey = (api.getConfig("hubspotApiKey") as string) ?? "";
          if (!apiKey) {
            res.status(400).json({ error: "HubSpot API key not configured" });
            return;
          }

          const { id: dealId } = req.params;
          const { stage } = req.body as { stage?: string };

          if (!stage) {
            res.status(400).json({ error: "stage is required" });
            return;
          }

          try {
            const deal = await updateDealStage(
              api.makeRequest,
              apiKey,
              dealId,
              stage,
            );
            res.status(200).json({ deal });
          } catch (err) {
            res.status(502).json({ error: (err as Error).message });
          }
        },
      });
    },

    // ── conversation:end ──────────────────────────────────────────────────────
    "conversation:end": async (context: PluginContext) => {
      const autoLog =
        (context.api.getConfig("autoLogConversations") as boolean) ?? true;
      if (!autoLog) return;

      const conversationId = (context as unknown as Record<string, unknown>)[
        "conversationId"
      ] as string | undefined;
      if (!conversationId) return;

      // Always queue a pending record for later manual linking
      const pending: PendingInteractionRecord = {
        conversationId,
        userId: context.userId,
        queuedAt: Date.now(),
      };
      await context.api.db.set(buildPendingKey(conversationId), pending);

      // If API key is configured, check for a stored contact association
      const apiKey = (context.api.getConfig("hubspotApiKey") as string) ?? "";
      if (!apiKey) return;

      const association = (await context.api.db.get(
        buildAssociationKey(conversationId),
      )) as { hubspotContactId: string } | null;
      if (!association?.hubspotContactId) return;

      try {
        const noteBody = [
          `Conversation logged by Agentbase`,
          `Conversation ID: ${conversationId}`,
          `User ID: ${context.userId}`,
          `Timestamp: ${new Date().toISOString()}`,
        ].join("\n");

        const note = await createNote(
          context.api.makeRequest,
          apiKey,
          noteBody,
        );
        await associateNoteWithContact(
          context.api.makeRequest,
          apiKey,
          note.id,
          association.hubspotContactId,
        );

        const record: ContactInteractionRecord = {
          hubspotContactId: association.hubspotContactId,
          conversationId,
          userId: context.userId,
          noteId: note.id,
          loggedAt: Date.now(),
        };
        await context.api.db.set(
          buildContactKey(association.hubspotContactId, conversationId),
          record,
        );
      } catch {
        // Silent failure — logging must not interrupt the conversation flow
      }
    },
  },
});
