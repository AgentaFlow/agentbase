'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  healthy: { color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
  degraded: { color: 'text-amber-700', bg: 'bg-amber-100', icon: '⚠️' },
  down: { color: 'text-red-700', bg: 'bg-red-100', icon: '❌' },
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatMb(mb: number): string {
  if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = async () => {
    try {
      const [h, s] = await Promise.all([
        api.getSystemHealth(),
        api.getPlatformStats(),
      ]);
      setHealth(h);
      setStats(s);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) return <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading system health...</div>;

  const overallConfig = STATUS_CONFIG[health?.status] || STATUS_CONFIG.down;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-xs text-slate-400 mt-1">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh (15s)
          </label>
          <button onClick={load} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {health && (
        <div className={`rounded-xl p-5 mb-6 ${overallConfig.bg}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{overallConfig.icon}</span>
            <div>
              <p className={`font-semibold text-lg ${overallConfig.color}`}>
                System {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </p>
              <p className={`text-sm ${overallConfig.color} opacity-75`}>
                {health.services?.filter((s: any) => s.status === 'healthy').length}/{health.services?.length} services operational
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Service Status */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Services</h2>
          <div className="space-y-3">
            {health?.services?.map((s: any) => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.down;
              return (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span>{cfg.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.name}</p>
                      {s.details?.error && <p className="text-xs text-red-500 mt-0.5">{s.details.error}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{s.status}</span>
                    {s.latencyMs !== undefined && (
                      <p className="text-[10px] text-slate-400 mt-1">{s.latencyMs}ms</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Metrics */}
        {health?.metrics && (
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4">System Metrics</h2>
            <div className="space-y-4">
              {/* Memory */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Memory</span>
                  <span className="text-slate-500">{formatMb(health.metrics.memory.used)} / {formatMb(health.metrics.memory.total)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    health.metrics.memory.percent > 90 ? 'bg-red-500' : health.metrics.memory.percent > 70 ? 'bg-amber-500' : 'bg-green-500'
                  }`} style={{ width: `${health.metrics.memory.percent}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{health.metrics.memory.percent}% used</p>
              </div>

              {/* CPU */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">CPU Load</span>
                  <span className="text-slate-500">{health.metrics.cpu.cores} cores</span>
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>1m: {health.metrics.cpu.loadAvg[0]}</span>
                  <span>5m: {health.metrics.cpu.loadAvg[1]}</span>
                  <span>15m: {health.metrics.cpu.loadAvg[2]}</span>
                </div>
              </div>

              {/* Process */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Process Memory</p>
                  <p className="text-lg font-semibold text-slate-900">{health.metrics.process.memoryMb} MB</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Process Uptime</p>
                  <p className="text-lg font-semibold text-slate-900">{formatUptime(health.metrics.process.uptimeSeconds)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">System Uptime</p>
                  <p className="text-lg font-semibold text-slate-900">{formatUptime(health.metrics.uptime)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platform Stats */}
        {stats && (
          <div className="col-span-2 bg-white border rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Platform Statistics</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-indigo-50 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-indigo-700">{stats.users?.total || 0}</p>
                <p className="text-xs text-indigo-500 mt-1">Total Users</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-violet-700">{stats.applications?.total || 0}</p>
                <p className="text-xs text-violet-500 mt-1">Applications</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-emerald-700">{stats.subscriptions?.active || 0}</p>
                <p className="text-xs text-emerald-500 mt-1">Active Subscriptions</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-amber-700">
                  {stats.subscriptions?.byPlan ? Object.values(stats.subscriptions.byPlan).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0}
                </p>
                <p className="text-xs text-amber-500 mt-1">Total Subscriptions</p>
              </div>
            </div>

            {/* Plan Breakdown */}
            {stats.subscriptions?.byPlan && Object.keys(stats.subscriptions.byPlan).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Subscriptions by Plan</p>
                <div className="flex gap-4">
                  {Object.entries(stats.subscriptions.byPlan).map(([plan, count]: [string, any]) => (
                    <div key={plan} className="flex items-center gap-2 text-sm">
                      <span className={`w-3 h-3 rounded-full ${
                        plan === 'enterprise' ? 'bg-amber-400' :
                        plan === 'pro' ? 'bg-violet-400' :
                        plan === 'starter' ? 'bg-blue-400' : 'bg-slate-300'
                      }`} />
                      <span className="text-slate-600 capitalize">{plan}: <strong>{count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
