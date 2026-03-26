"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "submissions" | "licenses" | "developers" | "revenue" | "export";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function maskKey(key: string) {
  // AB-XXXX-XXXX-XXXX-XXXX → AB-****-****-****-XXXX (last segment stays)
  const parts = key.split("-");
  if (parts.length < 2) return key;
  return parts
    .map((p, i) => (i === 0 || i === parts.length - 1 ? p : "****"))
    .join("-");
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const el = document.createElement("a");
  el.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  el.download = filename;
  el.click();
}

// ─── CSS Bar Chart ────────────────────────────────────────────────────────────

function BarChart({
  items,
  color = "#6366f1",
}: {
  items: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-28 text-xs text-slate-500 truncate text-right shrink-0">
            {item.label}
          </div>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, Math.round((item.value / max) * 100))}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <div className="w-20 text-xs text-slate-700 text-right shrink-0">
            {formatCents(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SplitBar({
  platformFee,
  developerPayout,
}: {
  platformFee: number;
  developerPayout: number;
}) {
  const total = platformFee + developerPayout || 1;
  const devPct = Math.round((developerPayout / total) * 100);
  const platPct = 100 - devPct;
  return (
    <div>
      <div className="flex h-8 rounded-lg overflow-hidden mb-2 text-xs font-medium">
        <div
          style={{ width: `${platPct}%` }}
          className="bg-amber-400 flex items-center justify-center"
        >
          <span className="text-amber-900">Platform {platPct}%</span>
        </div>
        <div
          style={{ width: `${devPct}%` }}
          className="bg-indigo-500 flex items-center justify-center"
        >
          <span className="text-white">Developer {devPct}%</span>
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Platform fees: {formatCents(platformFee)}</span>
        <span>Developer payouts: {formatCents(developerPayout)}</span>
      </div>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRows({
  count = 3,
  cols = 5,
}: {
  count?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b last:border-0 animate-pulse">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMarketplacePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("submissions");

  // ── Submissions ────────────────────────────────────────────────────────────
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Licenses ───────────────────────────────────────────────────────────────
  const [licenseQuery, setLicenseQuery] = useState("");
  const [licenses, setLicenses] = useState<any[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(false);

  // ── Developers ─────────────────────────────────────────────────────────────
  const [developers, setDevelopers] = useState<any[]>([]);
  const [devsLoading, setDevsLoading] = useState(false);

  // ── Purchases / Revenue ────────────────────────────────────────────────────
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  // ── Data loaders ───────────────────────────────────────────────────────────

  async function loadSubmissions() {
    setSubsLoading(true);
    try {
      const data = await api.getAdminPendingSubmissions();
      setSubmissions(data ?? []);
    } catch {
      setSubmissions([]);
    } finally {
      setSubsLoading(false);
    }
  }

  async function loadLicenses(q = "") {
    setLicensesLoading(true);
    try {
      const data = await api.adminSearchLicenses({ q });
      setLicenses(data ?? []);
    } catch {
      setLicenses([]);
    } finally {
      setLicensesLoading(false);
    }
  }

  async function loadDevelopers() {
    setDevsLoading(true);
    try {
      const data = await api.adminListDevelopers();
      setDevelopers(data ?? []);
    } catch {
      setDevelopers([]);
    } finally {
      setDevsLoading(false);
    }
  }

  async function loadPurchases(): Promise<any[]> {
    setPurchasesLoading(true);
    try {
      const data = await api.adminSearchPurchases({});
      setPurchases(data ?? []);
      return data ?? [];
    } catch {
      setPurchases([]);
      return [];
    } finally {
      setPurchasesLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "submissions") loadSubmissions();
    else if (tab === "licenses") loadLicenses(licenseQuery);
    else if (tab === "developers") loadDevelopers();
    else if (tab === "revenue" || tab === "export") loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Submission actions ─────────────────────────────────────────────────────

  async function handleApprove(id: string) {
    try {
      await api.approveSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    try {
      await api.rejectSubmission(id, rejectReason);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setRejectId(null);
      setRejectReason("");
    } catch (err: any) {
      alert(err.message);
    }
  }

  // ── License actions ────────────────────────────────────────────────────────

  async function handleRevokeLicense(id: string) {
    if (
      !confirm(
        "Revoke this license? This will immediately deactivate all connected instances.",
      )
    )
      return;
    try {
      await api.adminRevokeLicense(id);
      setLicenses((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "revoked" } : l)),
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  // ── Developer actions ──────────────────────────────────────────────────────

  async function handleTierChange(id: string, revenueShareTier: string) {
    try {
      await api.adminUpdateDeveloper(id, { revenueShareTier });
      setDevelopers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, revenueShareTier } : d)),
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleVerifiedToggle(id: string, isVerified: boolean) {
    try {
      await api.adminUpdateDeveloper(id, { isVerified });
      setDevelopers((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isVerified } : d)),
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  // ── Revenue aggregation ────────────────────────────────────────────────────

  const completed = purchases.filter((p) => p.status === "completed");
  const totalRevenue = completed.reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalPlatformFee = completed.reduce(
    (s, p) => s + (p.platformFee ?? 0),
    0,
  );
  const totalDevPayout = completed.reduce(
    (s, p) => s + (p.developerPayout ?? 0),
    0,
  );

  const byPlugin = Object.entries(
    completed.reduce<Record<string, number>>((acc, p) => {
      const key = p.pluginId ?? p.themeId ?? "unknown";
      acc[key] = (acc[key] ?? 0) + (p.amount ?? 0);
      return acc;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));

  const byMonth = Object.entries(
    completed.reduce<Record<string, number>>((acc, p) => {
      const month = p.createdAt
        ? new Date(p.createdAt).toISOString().slice(0, 7)
        : "unknown";
      acc[month] = (acc[month] ?? 0) + (p.amount ?? 0);
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  // ── CSV export ─────────────────────────────────────────────────────────────

  async function handleExportRevenueCsv() {
    const data = purchases.length > 0 ? purchases : await loadPurchases();
    const rows: string[][] = [
      [
        "Purchase ID",
        "Buyer",
        "Plugin / Theme",
        "Amount (cents)",
        "Platform Fee (cents)",
        "Developer Payout (cents)",
        "Status",
        "Date",
      ],
      ...data.map((p: any) => [
        p.id ?? "",
        p.buyerUserId ?? "",
        p.pluginId ?? p.themeId ?? "",
        String(p.amount ?? 0),
        String(p.platformFee ?? 0),
        String(p.developerPayout ?? 0),
        p.status ?? "",
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
      ]),
    ];
    downloadCsv(
      rows,
      `marketplace-revenue-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  async function handleExportDevelopersCsv() {
    const data =
      developers.length > 0
        ? developers
        : await (async () => {
            const d = await api.adminListDevelopers();
            setDevelopers(d ?? []);
            return d ?? [];
          })();
    const rows: string[][] = [
      [
        "Developer ID",
        "Display Name",
        "Stripe Status",
        "Revenue Tier",
        "Total Earnings (cents)",
        "Verified",
      ],
      ...data.map((d: any) => [
        d.id ?? "",
        d.displayName ?? "",
        d.stripeAccountStatus ?? "",
        d.revenueShareTier ?? "",
        String(d.totalEarnings ?? 0),
        d.isVerified ? "Yes" : "No",
      ]),
    ];
    downloadCsv(
      rows,
      `marketplace-developers-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">🔒</span>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Admin Access Required
        </h2>
        <p className="text-slate-500 text-sm">
          You need admin privileges to access this page.
        </p>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "submissions", label: "Submissions" },
    { id: "licenses", label: "Licenses" },
    { id: "developers", label: "Developers" },
    { id: "revenue", label: "Revenue" },
    { id: "export", label: "Export" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        Marketplace Admin
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Review submissions, manage licenses and developers, monitor revenue.
      </p>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.id === "submissions" && submissions.length > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                {submissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 21.2 Submissions ─────────────────────────────────────────────── */}
      {tab === "submissions" && (
        <>
          {subsLoading ? (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <tbody>
                  <SkeletonRows count={4} cols={5} />
                </tbody>
              </table>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-4xl block mb-3">✅</span>
              <p className="text-sm">
                No pending submissions — queue is clear.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Item
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Type
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Version
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Submitted
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <>
                      <tr key={sub.id} className="border-b">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">
                            {sub.catalogItemId ?? sub.id}
                          </p>
                          <p className="text-xs text-slate-500">
                            Author: {sub.authorId}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${sub.itemType === "plugin" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                          >
                            {sub.itemType ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {sub.version ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {sub.createdAt
                            ? new Date(sub.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(sub.id)}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectId(
                                  rejectId === sub.id ? null : sub.id,
                                );
                                setRejectReason("");
                              }}
                              className="text-xs border border-red-200 text-red-600 bg-red-50 px-3 py-1 rounded hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                      {rejectId === sub.id && (
                        <tr
                          key={`${sub.id}-reject`}
                          className="bg-red-50 border-b"
                        >
                          <td colSpan={5} className="px-4 py-3">
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Rejection reason (required)…"
                                value={rejectReason}
                                onChange={(e) =>
                                  setRejectReason(e.target.value)
                                }
                                className="flex-1 text-sm border border-red-200 rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-red-400"
                              />
                              <button
                                onClick={() => handleReject(sub.id)}
                                disabled={!rejectReason.trim()}
                                className="text-xs bg-red-600 text-white px-4 py-1.5 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => {
                                  setRejectId(null);
                                  setRejectReason("");
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── 21.3 Licenses ────────────────────────────────────────────────── */}
      {tab === "licenses" && (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by license key, plugin ID, or buyer ID…"
              value={licenseQuery}
              onChange={(e) => setLicenseQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLicenses(licenseQuery)}
              className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              onClick={() => loadLicenses(licenseQuery)}
              className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Search
            </button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                    License Key
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                    Plugin / Theme
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                    Buyer
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                    Activations
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {licensesLoading ? (
                  <SkeletonRows count={4} cols={6} />
                ) : licenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      {licenseQuery
                        ? "No licenses match your query."
                        : "Enter a search query above to find licenses."}
                    </td>
                  </tr>
                ) : (
                  licenses.map((lic) => (
                    <tr key={lic.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {maskKey(lic.licenseKey ?? "")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {lic.pluginId ?? lic.themeId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {lic.buyerUserId ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            lic.status === "active"
                              ? "bg-green-100 text-green-700"
                              : lic.status === "revoked"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {lic.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {lic.activations ?? 0} / {lic.maxActivations ?? "∞"}
                      </td>
                      <td className="px-4 py-3">
                        {lic.status !== "revoked" && (
                          <button
                            onClick={() => handleRevokeLicense(lic.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 21.4 Developers ──────────────────────────────────────────────── */}
      {tab === "developers" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Developer
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Stripe Status
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Revenue Tier
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Total Earnings
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody>
              {devsLoading ? (
                <SkeletonRows count={4} cols={5} />
              ) : developers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No developer profiles registered yet.
                  </td>
                </tr>
              ) : (
                developers.map((dev) => (
                  <tr key={dev.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {dev.displayName || "Unnamed"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {dev.agentbaseUserId}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          dev.stripeAccountStatus === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {dev.stripeAccountStatus ?? "none"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={dev.revenueShareTier ?? "standard_80"}
                        onChange={(e) =>
                          handleTierChange(dev.id, e.target.value)
                        }
                        className="text-xs border rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-brand-400"
                      >
                        <option value="standard_80">Standard (80%)</option>
                        <option value="premium_85">Premium (85%)</option>
                        <option value="elite_90">Elite (90%)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatCents(dev.totalEarnings ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          handleVerifiedToggle(dev.id, !dev.isVerified)
                        }
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${
                          dev.isVerified
                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {dev.isVerified ? "✓ Verified" : "Unverified"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 21.5 Revenue Analytics ───────────────────────────────────────── */}
      {tab === "revenue" && (
        <>
          {purchasesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-slate-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCents(totalRevenue)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {completed.length} completed purchase
                    {completed.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Platform Fees
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCents(totalPlatformFee)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ~
                    {totalRevenue > 0
                      ? Math.round((totalPlatformFee / totalRevenue) * 100)
                      : 0}
                    % of revenue
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Developer Payouts
                  </p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCents(totalDevPayout)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ~
                    {totalRevenue > 0
                      ? Math.round((totalDevPayout / totalRevenue) * 100)
                      : 0}
                    % of revenue
                  </p>
                </div>
              </div>

              {/* Platform fee vs developer payout split */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  Platform Fee vs. Developer Payout Split
                </h3>
                <SplitBar
                  platformFee={totalPlatformFee}
                  developerPayout={totalDevPayout}
                />
              </div>

              {/* Revenue by plugin / theme */}
              {byPlugin.length > 0 ? (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Revenue by Plugin / Theme{" "}
                    <span className="text-slate-400 font-normal">(top 10)</span>
                  </h3>
                  <BarChart items={byPlugin} color="#f59e0b" />
                </div>
              ) : null}

              {/* Monthly revenue */}
              {byMonth.length > 0 ? (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Monthly Revenue
                  </h3>
                  <BarChart items={byMonth} color="#6366f1" />
                </div>
              ) : null}

              {completed.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <span className="text-4xl block mb-3">📊</span>
                  <p className="text-sm">No completed purchases yet.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── 21.6 Export ──────────────────────────────────────────────────── */}
      {tab === "export" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            CSV files are generated in your browser from live API data. Each
            export triggers a fresh API call to ensure accuracy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">
                Revenue &amp; Purchases
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                All purchase records: amount, platform fee, developer payout,
                status, and date.
              </p>
              <button
                onClick={handleExportRevenueCsv}
                className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
              >
                ⬇ Export Revenue CSV
              </button>
            </div>
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">
                Developer Directory
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                All registered developers: Stripe status, revenue tier, total
                lifetime earnings, verification status.
              </p>
              <button
                onClick={handleExportDevelopersCsv}
                className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
              >
                ⬇ Export Developers CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
