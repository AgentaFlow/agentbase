'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

const PLAN_COLORS: Record<string, string> = {
  free: 'border-slate-200',
  starter: 'border-blue-400',
  pro: 'border-brand-500',
  enterprise: 'border-amber-500',
};

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const plan = searchParams.get('plan');
      setSuccessMessage(`Successfully upgraded to ${plan?.charAt(0).toUpperCase()}${plan?.slice(1)}!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const [plansData, usageData] = await Promise.all([
          api.getPlans(),
          api.getUsage().catch(() => null),
        ]);
        setPlans(plansData || []);
        setUsage(usageData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [successMessage]);

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan);
    try {
      const { url } = await api.createCheckout(plan);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { url } = await api.createPortalSession();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'No active subscription to manage');
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Billing & Plans</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border p-6 animate-pulse h-80" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Plans</h1>
        {usage?.stripeCustomerId && (
          <button onClick={handleManageBilling} className="text-sm border px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700">
            Manage Billing
          </button>
        )}
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {successMessage}
        </div>
      )}

      {/* Usage Meters */}
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <UsageMeter label="Tokens" used={usage.tokens.used} limit={usage.tokens.limit} percent={usage.tokens.percent} />
          <UsageMeter label="Messages" used={usage.messages.used} limit={usage.messages.limit} percent={usage.messages.percent} />
          <UsageMeter label="Apps" used="-" limit={usage.apps.limit} percent={0} simple />
          <UsageMeter label="API Keys" used="-" limit={usage.apiKeys.limit} percent={0} simple />
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {plans.map((plan: any) => {
          const isCurrent = usage?.plan === plan.tier;
          const isUpgrade = !isCurrent && plans.indexOf(plan) > plans.findIndex((p: any) => p.tier === usage?.plan);

          return (
            <div
              key={plan.tier}
              className={`bg-white rounded-xl border-2 p-6 flex flex-col transition-all ${
                isCurrent
                  ? `${PLAN_COLORS[plan.tier] || 'border-brand-500'} ring-2 ring-brand-100`
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {isCurrent && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 mb-2">Current Plan</span>
              )}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                {plan.price > 0 && <span className="text-slate-500 text-sm">/month</span>}
              </div>

              <ul className="flex-1 space-y-2 mb-6">
                {plan.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button disabled className="w-full py-2.5 rounded-lg bg-slate-100 text-slate-500 text-sm font-medium">
                  Current Plan
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={upgrading === plan.tier}
                  className="w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {upgrading === plan.tier ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                </button>
              ) : (
                <button disabled className="w-full py-2.5 rounded-lg border text-slate-400 text-sm">
                  -
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Billing Period */}
      {usage?.period?.start && (
        <div className="mt-6 text-xs text-slate-400 text-center">
          Current billing period: {new Date(usage.period.start).toLocaleDateString()} – {new Date(usage.period.end).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function UsageMeter({ label, used, limit, percent, simple }: {
  label: string; used: any; limit: number; percent: number; simple?: boolean;
}) {
  const color = percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-brand-500';
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      {simple ? (
        <p className="text-xl font-bold text-slate-900">Limit: {limit.toLocaleString()}</p>
      ) : (
        <>
          <p className="text-xl font-bold text-slate-900">{typeof used === 'number' ? used.toLocaleString() : used}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{limit.toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  );
}
