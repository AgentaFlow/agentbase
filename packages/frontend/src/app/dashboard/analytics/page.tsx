'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function AnalyticsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api.getApplications().then(data => {
      setApps(data || []);
      if (data?.length > 0) setSelectedAppId(data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedAppId) return;
    setLoading(true);
    (api as any).getAnalytics(selectedAppId, days)
      .then((data: any) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [selectedAppId, days]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm outline-none bg-white"
          >
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm outline-none bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border p-5 animate-pulse h-24" />)}
        </div>
      ) : !stats ? (
        <div className="text-center py-12 text-slate-400">
          <span className="text-4xl block mb-3">📊</span>
          <p className="text-sm">No analytics data yet. Start using your application to generate data.</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Conversations</p>
              <p className="text-2xl font-bold text-slate-900">{stats.conversations?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Messages</p>
              <p className="text-2xl font-bold text-slate-900">{stats.messages?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Tokens</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalTokens?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Est. Cost</p>
              <p className="text-2xl font-bold text-slate-900">${((stats.totalTokens || 0) * 0.00003).toFixed(2)}</p>
            </div>
          </div>

          {/* Daily Activity */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Daily Activity</h3>
            {stats.dailyActivity?.length > 0 ? (
              <div className="flex items-end gap-1" style={{ height: '140px' }}>
                {stats.dailyActivity.map((day: any) => {
                  const maxCount = Math.max(...stats.dailyActivity.map((d: any) => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div key={day._id} className="flex-1 flex flex-col items-center justify-end" title={`${day._id}: ${day.count} events`}>
                      <div
                        className="w-full bg-brand-500 rounded-t-sm min-h-[2px] transition-all"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <span className="text-[9px] text-slate-400 mt-1 truncate w-full text-center">
                        {day._id.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No activity data for this period</p>
            )}
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-slate-900 mb-3">By Provider</h3>
              {stats.providerBreakdown?.length > 0 ? (
                <div className="space-y-2">
                  {stats.providerBreakdown.map((item: any) => (
                    <div key={item._id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 capitalize">{item._id || 'Unknown'}</span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
            </div>
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-slate-900 mb-3">By Source</h3>
              {stats.sourceBreakdown?.length > 0 ? (
                <div className="space-y-2">
                  {stats.sourceBreakdown.map((item: any) => (
                    <div key={item._id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 capitalize">{item._id || 'Unknown'}</span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
