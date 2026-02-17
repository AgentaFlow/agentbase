'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [appsData, pluginsData] = await Promise.all([
          api.getApplications().catch(() => []),
          api.getPlugins().catch(() => []),
        ]);
        setApps(appsData || []);
        setPlugins(pluginsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeApps = apps.filter(a => a.status === 'active');

  const stats = [
    { label: 'Applications', value: apps.length, icon: '📱', color: 'bg-blue-50 text-blue-700' },
    { label: 'Active', value: activeApps.length, icon: '🟢', color: 'bg-green-50 text-green-700' },
    { label: 'Plugins Available', value: plugins.length, icon: '🧩', color: 'bg-purple-50 text-purple-700' },
    { label: 'Account', value: user?.role || 'user', icon: '👤', color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}
        </h1>
        <p className="text-slate-500 mt-1">Here's an overview of your AI applications.</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border p-5 animate-pulse h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</span>
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/applications" className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">📱</div>
            <h3 className="font-semibold text-slate-900">Applications</h3>
          </div>
          <p className="text-sm text-slate-500">Create and manage your AI applications</p>
        </Link>
        <Link href="/dashboard/plugins" className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">🧩</div>
            <h3 className="font-semibold text-slate-900">Plugin Marketplace</h3>
          </div>
          <p className="text-sm text-slate-500">Extend your apps with community plugins</p>
        </Link>
        <Link href="/dashboard/settings" className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">⚙️</div>
            <h3 className="font-semibold text-slate-900">Settings</h3>
          </div>
          <p className="text-sm text-slate-500">Profile, security, and API keys</p>
        </Link>
      </div>

      {/* Recent Applications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Recent Applications</h2>
          <Link href="/dashboard/applications" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border p-4 animate-pulse h-16" />)}</div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <span className="text-4xl block mb-3">🚀</span>
            <h3 className="font-semibold text-slate-900 mb-1">No applications yet</h3>
            <p className="text-sm text-slate-500 mb-4">Create your first AI application to get started</p>
            <Link href="/dashboard/applications" className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 font-medium text-sm inline-block">
              Create Application
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {apps.slice(0, 5).map(app => (
              <Link key={app.id} href={`/dashboard/applications/${app.id}`} className="bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow block">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <span className="text-brand-600 font-bold">{app.name?.[0] || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 text-sm">{app.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{app.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{app.config?.aiProvider || 'openai'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${app.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{app.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
