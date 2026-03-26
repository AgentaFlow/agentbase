"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardForm {
  partnerName: string;
  contactEmail: string;
  websiteUrl: string;
  instanceType: "self-hosted" | "commercial";
  notes: string;
}

interface VerifyResult {
  valid: boolean;
  domain?: string;
  since?: string;
}

const MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_MARKETPLACE_URL ??
  "https://marketplace.agentbase.dev";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function postOnboard(
  token: string,
  form: OnboardForm,
): Promise<{ message: string }> {
  const res = await fetch(`${MARKETPLACE_URL}/api/v1/partner/onboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      partnerName: form.partnerName,
      contactEmail: form.contactEmail,
      websiteUrl: form.websiteUrl,
      instanceType: form.instanceType,
      notes: form.notes || undefined,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ message: string }>;
}

async function fetchVerifyBadge(installationId: string): Promise<VerifyResult> {
  const res = await fetch(
    `${MARKETPLACE_URL}/api/v1/partner/verify-badge?installationId=${encodeURIComponent(installationId)}`,
  );
  return res.json() as Promise<VerifyResult>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PartnerAdminPage() {
  const { token } = useAuth();

  // Onboarding form state
  const [form, setForm] = useState<OnboardForm>({
    partnerName: "",
    contactEmail: "",
    websiteUrl: "",
    instanceType: "self-hosted",
    notes: "",
  });
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Badge verify state
  const [verifyId, setVerifyId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSending(true);
    setSentMessage(null);
    setSendError(null);
    try {
      const result = await postOnboard(token, form);
      setSentMessage(result.message);
      setForm({
        partnerName: "",
        contactEmail: "",
        websiteUrl: "",
        instanceType: "self-hosted",
        notes: "",
      });
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await fetchVerifyBadge(verifyId.trim());
      setVerifyResult(result);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Partner Program — Admin
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Onboard hosting partners and verify badge registrations. Partners
          receive an email with configuration instructions and a link to the
          Trademark License Agreement.
        </p>
      </div>

      {/* Docs links */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
        <p className="font-semibold text-slate-800">Partner Resources</p>
        <ul className="list-disc list-inside space-y-1 text-slate-600">
          <li>
            <a
              href="https://github.com/AgentaFlow/agentbase/blob/main/HOSTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              HOSTING.md
            </a>{" "}
            — configuration guide for partners
          </li>
          <li>
            <a
              href="https://github.com/AgentaFlow/agentbase-marketplace/blob/main/TRADEMARK_LICENSE_TEMPLATE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Trademark License Agreement Template
            </a>{" "}
            — requires legal review before execution
          </li>
          <li>
            Badge verify endpoint:{" "}
            <code className="bg-slate-200 rounded px-1 py-0.5 text-xs">
              GET /api/v1/partner/verify-badge?installationId=
            </code>
          </li>
        </ul>
      </div>

      {/* ─── Partner Onboarding Form ─────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">
          Onboard a New Partner
        </h2>
        <form
          onSubmit={(e) => void handleOnboard(e)}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2"
        >
          {/* Partner name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company / Partner Name
            </label>
            <input
              name="partnerName"
              value={form.partnerName}
              onChange={handleChange}
              required
              placeholder="Acme Hosting Ltd."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Contact email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contact Email
            </label>
            <input
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={handleChange}
              required
              placeholder="partner@company.example"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Website URL
            </label>
            <input
              name="websiteUrl"
              type="url"
              value={form.websiteUrl}
              onChange={handleChange}
              required
              placeholder="https://company.example"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Instance type */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instance Type
            </label>
            <select
              name="instanceType"
              value={form.instanceType}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="self-hosted">
                Self-Hosted (internal/non-commercial)
              </option>
              <option value="commercial">
                Commercial Hosting (reselling to end users)
              </option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional context about this partner…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="sm:col-span-2 flex items-center gap-4">
            <button
              type="submit"
              disabled={sending}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {sending ? "Sending…" : "Send Onboarding Email"}
            </button>

            {sentMessage && (
              <p className="text-sm text-green-700 font-medium">
                {sentMessage}
              </p>
            )}
            {sendError && (
              <p className="text-sm text-red-600 font-medium">
                Error: {sendError}
              </p>
            )}
          </div>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          This action sends a welcome email to the partner with MARKETPLACE_URL
          config instructions and badge setup guidance. It also sends an
          internal notification to partners@agentbase.dev.{" "}
          {form.instanceType === "commercial" && (
            <span className="text-amber-700 font-medium">
              Commercial partners require a signed Trademark License Agreement
              before using the Agentbase name publicly.
            </span>
          )}
        </p>
      </section>

      <hr className="border-slate-200" />

      {/* ─── Badge Verification Tool ─────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">
          Badge Verification Lookup
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Enter an installation's hashed instance ID to check whether it is
          registered in the marketplace and eligible to display the
          &ldquo;Powered by Agentbase&rdquo; badge.
        </p>
        <form
          onSubmit={(e) => void handleVerify(e)}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            value={verifyId}
            onChange={(e) => setVerifyId(e.target.value)}
            required
            placeholder="Hashed instanceId…"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={verifying || !verifyId.trim()}
            className="rounded-md bg-slate-700 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {verifying ? "Checking…" : "Verify"}
          </button>
        </form>

        {verifyResult !== null && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              verifyResult.valid
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {verifyResult.valid ? (
              <>
                <p className="font-semibold">✅ Valid — badge eligible</p>
                <p className="mt-1">
                  Domain:{" "}
                  <span className="font-mono">{verifyResult.domain}</span>
                </p>
                <p>
                  Registered since:{" "}
                  {verifyResult.since
                    ? new Date(verifyResult.since).toLocaleString()
                    : "—"}
                </p>
              </>
            ) : (
              <p className="font-semibold">
                ❌ Not found — this installation ID is not registered in the
                marketplace.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
