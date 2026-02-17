'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';

const ACTION_COLORS: Record<string, string> = {
  'auth.login': 'bg-green-100 text-green-700',
  'auth.login_failed': 'bg-red-100 text-red-700',
  'auth.register': 'bg-blue-100 text-blue-700',
  'auth.password_changed': 'bg-amber-100 text-amber-700',
  'application.created': 'bg-indigo-100 text-indigo-700',
  'application.updated': 'bg-indigo-100 text-indigo-700',
  'application.deleted': 'bg-red-100 text-red-700',
  'api_key.created': 'bg-purple-100 text-purple-700',
  'api_key.revoked': 'bg-amber-100 text-amber-700',
  'plugin.installed': 'bg-teal-100 text-teal-700',
  'webhook.created': 'bg-cyan-100 text-cyan-700',
  'subscription.changed': 'bg-pink-100 text-pink-700',
};

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [activity, setActivity] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: '', resource: '' });
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'logs' | 'activity' | 'security'>('logs');
  const isAdmin = user?.role === 'admin';

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await api.getAuditLogs({
        action: filter.action || undefined,
        resource: filter.resource || undefined,
        limit: 30,
        skip: page * 30,
      });
      setLogs(result.logs || []);
      setTotal(result.total || 0);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, [page, filter]);

  useEffect(() => {
    api.getMyActivity(30).then(setActivity).catch(() => setActivity([]));
    if (isAdmin) {
      api.getSecurityEvents(50).then(setSecurityEvents).catch(() => setSecurityEvents([]));
    }
  }, []);

  const tabs = [
    { key: 'logs' as const, label: 'Event Log', icon: '📋' },
    { key: 'activity' as const, label: 'My Activity', icon: '📊' },
    ...(isAdmin ? [{ key: 'security' as const, label: 'Security Events', icon: '🛡️' }] : []),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Audit Log</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Event Log Tab */}
      {activeTab === 'logs' && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={filter.action}
              onChange={e => { setFilter(f => ({ ...f, action: e.target.value })); setPage(0); }}
              placeholder="Filter by action (e.g. auth.login)..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="text"
              value={filter.resource}
              onChange={e => { setFilter(f => ({ ...f, resource: e.target.value })); setPage(0); }}
              placeholder="Filter by resource..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button onClick={() => { setFilter({ action: '', resource: '' }); setPage(0); }} className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Clear
            </button>
          </div>

          {loading ? (
            <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-5xl block mb-3">📋</span>
              <p className="text-sm">No audit events found</p>
            </div>
          ) : (
            <>
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 font-medium text-slate-500">Time</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Action</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Resource</th>
                      {isAdmin && <th className="px-4 py-3 font-medium text-slate-500">User</th>}
                      <th className="px-4 py-3 font-medium text-slate-500">Outcome</th>
                      <th className="px-4 py-3 font-medium text-slate-500">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any, i: number) => (
                      <tr key={log._id || i} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {log.resource && <span>{log.resource}</span>}
                          {log.resourceId && <span className="text-slate-400 ml-1">({log.resourceId.slice(0, 8)}...)</span>}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-xs text-slate-500">{log.userEmail || log.userId?.slice(0, 8)}</td>
                        )}
                        <td className="px-4 py-3">
                          <span className={`text-xs ${
                            log.outcome === 'success' ? 'text-green-600' : log.outcome === 'failure' ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {log.outcome}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.ipAddress || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-slate-400">{total} total events</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="text-xs px-3 py-1.5 border rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-slate-400 px-2 py-1.5">Page {page + 1}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * 30 >= total}
                    className="text-xs px-3 py-1.5 border rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Activity Summary Tab */}
      {activeTab === 'activity' && (
        <div>
          {activity.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-5xl block mb-3">📊</span>
              <p className="text-sm">No activity in the last 30 days</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activity.map((item: any) => (
                <div key={item._id} className="bg-white border rounded-xl p-5">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_COLORS[item._id] || 'bg-slate-100 text-slate-600'}`}>
                    {item._id}
                  </span>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{item.count}</p>
                  <p className="text-xs text-slate-400 mt-1">Last: {new Date(item.lastOccurrence).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security Events Tab (admin only) */}
      {activeTab === 'security' && isAdmin && (
        <div>
          {securityEvents.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-5xl block mb-3">🛡️</span>
              <p className="text-sm">No security events recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {securityEvents.map((ev: any, i: number) => (
                <div key={ev._id || i} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${ACTION_COLORS[ev.action] || 'bg-slate-100 text-slate-600'}`}>
                    {ev.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{ev.userEmail || ev.userId?.slice(0, 12)}</p>
                    {ev.details && <p className="text-xs text-slate-400 truncate">{JSON.stringify(ev.details).slice(0, 80)}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-medium ${ev.outcome === 'failure' ? 'text-red-500' : 'text-green-500'}`}>{ev.outcome}</p>
                    <p className="text-[10px] text-slate-400">{new Date(ev.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono flex-shrink-0">{ev.ipAddress || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
