/**
 * Email Automation
 *
 * Transactional emails, drip campaigns, and AI-generated copy via Resend or
 * SendGrid. Supports welcome emails on user registration, conversation summary
 * emails on session end, custom template management, and time-delayed drip
 * campaign sequences.
 *
 * All external API calls use `makeRequest` (no eval/exec/child_process).
 * AI copy generation uses the platform's internal AI completions endpoint.
 *
 * @package @agentbase/plugin-email-automation
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";

// ── Constants ─────────────────────────────────────────────────────────────────

export const RESEND_API_URL = "https://api.resend.com/emails";
export const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

/** Internal platform AI completions endpoint. */
export const AI_COMPLETIONS_PATH = "/api/v1/internal/ai/completions";

export const SUPPORTED_PROVIDERS = ["resend", "sendgrid"] as const;
export type Provider = (typeof SUPPORTED_PROVIDERS)[number];
export const DEFAULT_PROVIDER: Provider = "resend";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  slug: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  isSystem?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DripStep {
  /** Hours to wait after previous step (or after subscribe for step 0). */
  delayHours: number;
  templateSlug: string;
  /** Optional subject override; falls back to template subject. */
  subject?: string;
}

export interface DripCampaign {
  campaignId: string;
  name: string;
  description?: string;
  steps: DripStep[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriberState {
  campaignId: string;
  email: string;
  currentStep: number;
  /** epoch ms — when to send the next step */
  nextSendAt: number;
  joinedAt: number;
  completed: boolean;
  lastSentAt?: number;
}

export interface EmailReceipt {
  messageId: string;
  provider: Provider;
  to: string;
  subject: string;
  sentAt: number;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ── DB Key Helpers ────────────────────────────────────────────────────────────

export function buildTemplateKey(slug: string): string {
  return `template:${slug}`;
}

export function buildCampaignKey(id: string): string {
  return `campaign:${id}`;
}

export function buildSubscriberKey(email: string, campaignId: string): string {
  return `subscriber:${email}:${campaignId}`;
}

export function buildSentKey(messageId: string): string {
  return `sent:${messageId}`;
}

// ── Template Engine ───────────────────────────────────────────────────────────

/**
 * Replace `{{variable}}` placeholders in a template string.
 * Unknown variable names are left as-is (returned unchanged).
 */
export function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return key in vars ? vars[key] : `{{${key}}}`;
  });
}

// ── Email Provider Adapters ───────────────────────────────────────────────────

interface ResendSuccessBody {
  id: string;
}

export async function sendViaResend(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  fromAddress: string,
  fromName: string,
  options: SendEmailOptions,
): Promise<EmailReceipt> {
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
  const response = await makeRequest(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status}`);
  }

  const data = (await response.json()) as ResendSuccessBody;
  return {
    messageId: data.id,
    provider: "resend",
    to: options.to,
    subject: options.subject,
    sentAt: Date.now(),
  };
}

export async function sendViaSendGrid(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  apiKey: string,
  fromAddress: string,
  fromName: string,
  options: SendEmailOptions,
): Promise<EmailReceipt> {
  const response = await makeRequest(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: fromAddress, ...(fromName ? { name: fromName } : {}) },
      subject: options.subject,
      content: [{ type: "text/html", value: options.html }],
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid API error: ${response.status}`);
  }

  // SendGrid returns 202 No Content — generate a deterministic message ID
  const messageId = `sg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    messageId,
    provider: "sendgrid",
    to: options.to,
    subject: options.subject,
    sentAt: Date.now(),
  };
}

/**
 * Dispatch a single email using the provider specified in plugin config.
 */
export async function sendEmail(
  config: Record<string, unknown>,
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  options: SendEmailOptions,
): Promise<EmailReceipt> {
  const provider = (config["provider"] as Provider) ?? DEFAULT_PROVIDER;
  const apiKey = (config["apiKey"] as string) ?? "";
  const fromAddress = (config["fromAddress"] as string) ?? "";
  const fromName = (config["fromName"] as string) ?? "";

  if (!apiKey) throw new Error("Email provider API key is not configured");
  if (!fromAddress) throw new Error("fromAddress is not configured");

  if (provider === "sendgrid") {
    return sendViaSendGrid(makeRequest, apiKey, fromAddress, fromName, options);
  }
  return sendViaResend(makeRequest, apiKey, fromAddress, fromName, options);
}

// ── AI Copy Generation ────────────────────────────────────────────────────────

/**
 * Ask the platform AI service to draft email copy based on a prompt.
 * Returns the generated HTML body string.
 */
export async function generateEmailCopy(
  makeRequest: (url: string, opts?: RequestInit) => Promise<Response>,
  prompt: string,
  model = "gpt-4o",
): Promise<string> {
  const response = await makeRequest(AI_COMPLETIONS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert email copywriter. Write concise, engaging email content. " +
            "Return only the HTML body (no <html>/<body> wrapper tags). Use clear formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new Error(`AI service error: ${response.status}`);

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data["choices"] as Array<{
    message: { content: string };
  }> | undefined;

  if (choices?.[0]?.message?.content) return choices[0].message.content;
  if (typeof data["content"] === "string") return data["content"] as string;
  throw new Error("Unexpected AI response shape");
}

// ── Drip Campaign Cron Handler ────────────────────────────────────────────────

/**
 * Advance drip campaign subscribers: send the next scheduled step to any
 * subscriber whose `nextSendAt` is in the past, then advance their pointer.
 *
 * @returns Number of emails successfully sent.
 */
export async function advanceDripSubscribers(
  context: PluginContext,
): Promise<number> {
  const { api } = context;
  const now = Date.now();
  let sent = 0;

  const subscriberKeys = await api.db.keys("subscriber:");
  for (const key of subscriberKeys) {
    const state = (await api.db.get(key)) as SubscriberState | null;
    if (!state || state.completed || state.nextSendAt > now) continue;

    const campaign = (await api.db.get(
      buildCampaignKey(state.campaignId),
    )) as DripCampaign | null;
    if (!campaign || !campaign.active) continue;

    const step = campaign.steps[state.currentStep];
    if (!step) {
      await api.db.set(key, { ...state, completed: true } as SubscriberState);
      continue;
    }

    const template = (await api.db.get(
      buildTemplateKey(step.templateSlug),
    )) as EmailTemplate | null;
    if (!template) continue;

    const subject =
      step.subject ??
      interpolate(template.subject, { email: state.email });
    const html = interpolate(template.body, { email: state.email });

    try {
      const receipt = await sendEmail(
        {
          provider: api.getConfig("provider") as unknown,
          apiKey: api.getConfig("apiKey") as unknown,
          fromAddress: api.getConfig("fromAddress") as unknown,
          fromName: api.getConfig("fromName") as unknown,
        },
        api.makeRequest,
        { to: state.email, subject, html },
      );

      await api.db.set(buildSentKey(receipt.messageId), receipt);

      const nextIndex = state.currentStep + 1;
      const nextStep = campaign.steps[nextIndex];
      const updated: SubscriberState = {
        ...state,
        currentStep: nextIndex,
        nextSendAt: nextStep ? now + nextStep.delayHours * 3_600_000 : 0,
        completed: !nextStep,
        lastSentAt: now,
      };
      await api.db.set(key, updated);
      sent++;
    } catch (err) {
      api.log(
        `Drip send failed for ${state.email}: ${(err as Error).message}`,
        "error",
      );
    }
  }

  return sent;
}

// ── Built-in System Templates ─────────────────────────────────────────────────

export const SYSTEM_TEMPLATES: EmailTemplate[] = [
  {
    slug: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{appName}}!",
    body:
      "<h1>Welcome, {{userName}}!</h1>" +
      "<p>Thanks for joining <strong>{{appName}}</strong>. " +
      "We're excited to have you on board.</p>" +
      "<p>— The {{appName}} Team</p>",
    variables: ["appName", "userName"],
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    slug: "conversation-summary",
    name: "Conversation Summary",
    subject: "Your conversation summary",
    body:
      "<h2>Conversation Summary</h2>" +
      "<p><strong>Date:</strong> {{date}}</p>" +
      "<p><strong>Duration:</strong> {{duration}}</p>" +
      "<p>{{summary}}</p>",
    variables: ["date", "duration", "summary"],
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

// ── Plugin Definition ─────────────────────────────────────────────────────────

export default createPlugin({
  name: "email-automation",
  version: "1.0.0",
  description:
    "Transactional emails, drip campaigns, and AI-generated copy via Resend or SendGrid.",
  permissions: ["network:external", "db:readwrite"],
  settings: {
    provider: {
      type: "select",
      label: "Email Provider",
      default: "resend",
      options: ["resend", "sendgrid"],
    },
    apiKey: {
      type: "string",
      label: "Provider API Key",
      encrypted: true,
    },
    fromAddress: {
      type: "string",
      label: "From Address",
    },
    fromName: {
      type: "string",
      label: "From Name",
    },
    sendSummaryOnEnd: {
      type: "boolean",
      label: "Send Conversation Summary on End",
      default: false,
    },
  },

  hooks: {
    "app:init": async (context) => {
      const { api } = context;

      // Seed system templates if absent
      for (const tpl of SYSTEM_TEMPLATES) {
        const existing = await api.db.get(buildTemplateKey(tpl.slug));
        if (!existing) {
          await api.db.set(buildTemplateKey(tpl.slug), tpl);
        }
      }

      // ── POST /send ──────────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/send",
        auth: true,
        description: "Send a transactional email",
        handler: async (req, res) => {
          const { to, subject, html, text, templateSlug, vars } =
            req.body as {
              to?: string;
              subject?: string;
              html?: string;
              text?: string;
              templateSlug?: string;
              vars?: Record<string, string>;
            };

          if (!to) {
            res.status(400).json({ error: "`to` is required" });
            return;
          }

          let finalSubject = subject ?? "";
          let finalHtml = html ?? "";

          if (templateSlug) {
            const tpl = (await api.db.get(
              buildTemplateKey(templateSlug),
            )) as EmailTemplate | null;
            if (!tpl) {
              res
                .status(404)
                .json({ error: `Template '${templateSlug}' not found` });
              return;
            }
            finalSubject = interpolate(tpl.subject, vars ?? {});
            finalHtml = interpolate(tpl.body, vars ?? {});
          }

          if (!finalSubject || !finalHtml) {
            res.status(400).json({
              error: "subject and html (or templateSlug) are required",
            });
            return;
          }

          try {
            const receipt = await sendEmail(
              {
                provider: api.getConfig("provider"),
                apiKey: api.getConfig("apiKey"),
                fromAddress: api.getConfig("fromAddress"),
                fromName: api.getConfig("fromName"),
              },
              api.makeRequest,
              { to, subject: finalSubject, html: finalHtml, text },
            );
            await api.db.set(buildSentKey(receipt.messageId), receipt);
            res.status(200).json({ success: true, messageId: receipt.messageId });
          } catch (err) {
            res.status(500).json({ error: (err as Error).message });
          }
        },
      });

      // ── GET /templates ──────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/templates",
        auth: true,
        description: "List all email templates",
        handler: async (_req, res) => {
          const keys = await api.db.keys("template:");
          const templates = await Promise.all(
            keys.map((k) => api.db.get(k) as Promise<EmailTemplate | null>),
          );
          res.status(200).json({ templates: templates.filter(Boolean) });
        },
      });

      // ── POST /templates ─────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/templates",
        auth: true,
        description: "Create a custom email template",
        handler: async (req, res) => {
          const { slug, name, subject, body, variables } =
            req.body as Partial<EmailTemplate>;

          if (!slug || !name || !subject || !body) {
            res.status(400).json({
              error: "slug, name, subject, and body are required",
            });
            return;
          }

          const existing = await api.db.get(buildTemplateKey(slug));
          if (existing) {
            res
              .status(409)
              .json({ error: `Template '${slug}' already exists` });
            return;
          }

          const now = Date.now();
          const template: EmailTemplate = {
            slug,
            name,
            subject,
            body,
            variables: variables ?? [],
            isSystem: false,
            createdAt: now,
            updatedAt: now,
          };
          await api.db.set(buildTemplateKey(slug), template);
          res.status(201).json({ template });
        },
      });

      // ── PUT /templates/:id ──────────────────────────────────────────────────
      api.registerEndpoint({
        method: "PUT",
        path: "/templates/:id",
        auth: true,
        description: "Update an existing email template",
        handler: async (req, res) => {
          const { id } = req.params;
          const existing = (await api.db.get(
            buildTemplateKey(id),
          )) as EmailTemplate | null;

          if (!existing) {
            res.status(404).json({ error: `Template '${id}' not found` });
            return;
          }
          if (existing.isSystem) {
            res
              .status(403)
              .json({ error: "System templates cannot be modified" });
            return;
          }

          const { name, subject, body, variables } =
            req.body as Partial<EmailTemplate>;
          const updated: EmailTemplate = {
            ...existing,
            name: name ?? existing.name,
            subject: subject ?? existing.subject,
            body: body ?? existing.body,
            variables: variables ?? existing.variables,
            updatedAt: Date.now(),
          };
          await api.db.set(buildTemplateKey(id), updated);
          res.status(200).json({ template: updated });
        },
      });

      // ── POST /campaign ──────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/campaign",
        auth: true,
        description: "Create a drip campaign",
        handler: async (req, res) => {
          const { name, description, steps } =
            req.body as Partial<DripCampaign>;

          if (!name || !steps || steps.length === 0) {
            res
              .status(400)
              .json({ error: "name and steps[] are required" });
            return;
          }

          const now = Date.now();
          const campaignId = `cmp_${now}_${Math.random()
            .toString(36)
            .slice(2, 9)}`;
          const campaign: DripCampaign = {
            campaignId,
            name,
            description,
            steps,
            active: true,
            createdAt: now,
            updatedAt: now,
          };
          await api.db.set(buildCampaignKey(campaignId), campaign);
          res.status(201).json({ campaign });
        },
      });

      // ── GET /campaigns ──────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/campaigns",
        auth: true,
        description: "List all drip campaigns",
        handler: async (_req, res) => {
          const keys = await api.db.keys("campaign:");
          const campaigns = await Promise.all(
            keys.map((k) => api.db.get(k) as Promise<DripCampaign | null>),
          );
          res.status(200).json({ campaigns: campaigns.filter(Boolean) });
        },
      });

      // ── GET /campaigns/:id/stats ────────────────────────────────────────────
      api.registerEndpoint({
        method: "GET",
        path: "/campaigns/:id/stats",
        auth: true,
        description: "Get subscriber statistics for a drip campaign",
        handler: async (req, res) => {
          const { id } = req.params;
          const campaign = (await api.db.get(
            buildCampaignKey(id),
          )) as DripCampaign | null;

          if (!campaign) {
            res.status(404).json({ error: `Campaign '${id}' not found` });
            return;
          }

          const subKeys = await api.db.keys("subscriber:");
          const allSubs = await Promise.all(
            subKeys.map(
              (k) => api.db.get(k) as Promise<SubscriberState | null>,
            ),
          );
          const campaignSubs = allSubs.filter(
            (s): s is SubscriberState => !!s && s.campaignId === id,
          );

          const total = campaignSubs.length;
          const completed = campaignSubs.filter((s) => s.completed).length;

          res.status(200).json({
            campaignId: id,
            name: campaign.name,
            totalSubscribers: total,
            activeSubscribers: total - completed,
            completedSubscribers: completed,
            steps: campaign.steps.length,
          });
        },
      });

      // ── POST /campaign/:id/subscribe ────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/campaign/:id/subscribe",
        auth: true,
        description: "Subscribe an email address to a drip campaign",
        handler: async (req, res) => {
          const { id } = req.params;
          const { email } = req.body as { email?: string };

          if (!email) {
            res.status(400).json({ error: "`email` is required" });
            return;
          }

          const campaign = (await api.db.get(
            buildCampaignKey(id),
          )) as DripCampaign | null;
          if (!campaign) {
            res.status(404).json({ error: `Campaign '${id}' not found` });
            return;
          }

          const subKey = buildSubscriberKey(email, id);
          const existing = await api.db.get(subKey);
          if (existing) {
            res.status(409).json({ error: "Email is already subscribed" });
            return;
          }

          const now = Date.now();
          const firstStep = campaign.steps[0];
          const state: SubscriberState = {
            campaignId: id,
            email,
            currentStep: 0,
            nextSendAt: firstStep
              ? now + firstStep.delayHours * 3_600_000
              : now,
            joinedAt: now,
            completed: campaign.steps.length === 0,
          };
          await api.db.set(subKey, state);
          res.status(201).json({ subscribed: true, nextSendAt: state.nextSendAt });
        },
      });

      // ── POST /generate ──────────────────────────────────────────────────────
      api.registerEndpoint({
        method: "POST",
        path: "/generate",
        auth: true,
        description: "Generate email copy using AI",
        handler: async (req, res) => {
          const { prompt, model } = req.body as {
            prompt?: string;
            model?: string;
          };
          if (!prompt) {
            res.status(400).json({ error: "`prompt` is required" });
            return;
          }
          try {
            const content = await generateEmailCopy(
              api.makeRequest,
              prompt,
              model ?? "gpt-4o",
            );
            res.status(200).json({ content });
          } catch (err) {
            res.status(500).json({ error: (err as Error).message });
          }
        },
      });

      // ── Cron: advance drip subscribers (hourly) ─────────────────────────────
      api.registerCronJob({
        name: "email-automation:advance-drip",
        schedule: "0 * * * *",
        handler: async (ctx) => {
          await advanceDripSubscribers(ctx);
        },
      });

      // ── Cron: daily digest (8 AM UTC) ───────────────────────────────────────
      api.registerCronJob({
        name: "email-automation:daily-digest",
        schedule: "0 8 * * *",
        handler: async (ctx) => {
          ctx.api.log(
            "Daily digest cron triggered (no-op unless configured)",
            "info",
          );
        },
      });
    },

    // ── user:register hook ────────────────────────────────────────────────────
    "user:register": async (
      context,
      user: { id?: string; email?: string; name?: string },
    ) => {
      const { api } = context;
      const apiKey = (api.getConfig("apiKey") as string) ?? "";
      const fromAddress = (api.getConfig("fromAddress") as string) ?? "";
      if (!apiKey || !fromAddress || !user?.email) return;

      const tpl = (await api.db.get(
        buildTemplateKey("welcome"),
      )) as EmailTemplate | null;
      if (!tpl) return;

      const appName = (api.getConfig("appName") as string) ?? "Agentbase";
      const subject = interpolate(tpl.subject, { appName });
      const html = interpolate(tpl.body, {
        appName,
        userName: user.name ?? user.email,
      });

      try {
        const receipt = await sendEmail(
          {
            provider: api.getConfig("provider"),
            apiKey,
            fromAddress,
            fromName: api.getConfig("fromName"),
          },
          api.makeRequest,
          { to: user.email, subject, html },
        );
        await api.db.set(buildSentKey(receipt.messageId), receipt);
      } catch (err) {
        api.log(
          `Welcome email failed for ${user.email}: ${(err as Error).message}`,
          "error",
        );
      }
    },

    // ── conversation:end hook ─────────────────────────────────────────────────
    "conversation:end": async (
      context,
      conversation: {
        id?: string;
        email?: string;
        summary?: string;
        duration?: number;
      },
    ) => {
      const { api } = context;
      const sendSummaryOnEnd =
        (api.getConfig("sendSummaryOnEnd") as boolean) ?? false;
      if (!sendSummaryOnEnd) return;

      const apiKey = (api.getConfig("apiKey") as string) ?? "";
      const fromAddress = (api.getConfig("fromAddress") as string) ?? "";
      if (!apiKey || !fromAddress || !conversation?.email) return;

      const tpl = (await api.db.get(
        buildTemplateKey("conversation-summary"),
      )) as EmailTemplate | null;
      if (!tpl) return;

      const date = new Date().toLocaleDateString();
      const duration = conversation.duration
        ? `${Math.ceil(conversation.duration / 60)} minute(s)`
        : "unknown";
      const summary = conversation.summary ?? "(no summary available)";

      const subject = interpolate(tpl.subject, {});
      const html = interpolate(tpl.body, { date, duration, summary });

      try {
        const receipt = await sendEmail(
          {
            provider: api.getConfig("provider"),
            apiKey,
            fromAddress,
            fromName: api.getConfig("fromName"),
          },
          api.makeRequest,
          { to: conversation.email, subject, html },
        );
        await api.db.set(buildSentKey(receipt.messageId), receipt);
      } catch (err) {
        api.log(
          `Conversation summary email failed: ${(err as Error).message}`,
          "error",
        );
      }
    },
  },
});
