"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function DeveloperEarningsPage() {
  const [earnings, setEarnings] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getDeveloperEarnings().catch(() => null),
      api.getDeveloperPayouts().catch(() => []),
    ])
      .then(([e, p]) => {
        setEarnings(e);
        setPayouts(p || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatCents = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-slate-400">
        <span className="text-5xl block mb-3">⚠️</span>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Earnings & Payouts
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your revenue from plugin and theme sales on the marketplace.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Lifetime Earnings
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {earnings ? formatCents(earnings.lifetimeTotal ?? 0) : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">After 20% platform fee</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Last 30 Days
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {earnings ? formatCents(earnings.last30Days ?? 0) : "—"}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Pending Payout
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {earnings ? formatCents(earnings.pendingPayout ?? 0) : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Paid out monthly</p>
        </div>
      </div>

      {/* Breakdown by plugin */}
      {earnings?.byPlugin?.length > 0 && (
        <div className="bg-white border rounded-xl mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-slate-900">Revenue by Plugin</h2>
          </div>
          <div className="divide-y">
            {earnings.byPlugin.map((item: any) => (
              <div
                key={item.pluginId}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.pluginName}
                  </p>
                  <p className="text-xs text-slate-400">{item.sales} sales</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCents(item.developerEarnings)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly breakdown */}
      {earnings?.byMonth?.length > 0 && (
        <div className="bg-white border rounded-xl mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-slate-900">Monthly Breakdown</h2>
          </div>
          <div className="divide-y">
            {earnings.byMonth.map((item: any) => (
              <div
                key={item.month}
                className="px-6 py-4 flex items-center justify-between"
              >
                <p className="text-sm text-slate-700">{item.month}</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCents(item.developerEarnings)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout history */}
      <div className="bg-white border rounded-xl">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-900">Payout History</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">
            No payouts yet. Connect Stripe on the{" "}
            <a
              href="/dashboard/developer"
              className="text-brand-600 hover:underline"
            >
              developer portal
            </a>{" "}
            to enable payouts.
          </div>
        ) : (
          <div className="divide-y">
            {payouts.map((payout: any) => (
              <div
                key={payout.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatCents(payout.amount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(payout.arrivalDate ?? payout.created)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    payout.status === "paid"
                      ? "bg-green-50 text-green-700"
                      : payout.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
