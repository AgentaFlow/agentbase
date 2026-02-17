'use client';

import { useState } from 'react';
import { usePlugins } from '@/lib/hooks';

export default function PluginsPage() {
  const { data: plugins, loading } = usePlugins();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');

  const filtered = (plugins || []).filter((p: any) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'free' && !p.isPaid) || (filter === 'paid' && p.isPaid);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Plugin Marketplace</h1>

      <div className="flex gap-3 mb-6">
        <input type="text" placeholder="Search plugins..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-2 border rounded-lg outline-none bg-white text-sm">
          <option value="all">All</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse text-slate-400 py-12 text-center">Loading plugins...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <span className="text-5xl block mb-4">🧩</span>
          <h3 className="text-lg font-semibold mb-2">No plugins found</h3>
          <p className="text-slate-500 text-sm">
            {search ? 'Try a different search term.' : 'Plugins will appear here once published to the marketplace.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plugin: any) => (
            <div key={plugin.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <span className="text-brand-600 font-bold">{plugin.name[0]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {plugin.isPaid && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">${plugin.price}</span>}
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">v{plugin.version}</span>
                </div>
              </div>
              <h3 className="font-medium text-slate-900 mb-1">{plugin.name}</h3>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{plugin.description || 'No description'}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {plugin.rating > 0 && <span>{'★'.repeat(Math.round(plugin.rating))} {plugin.rating}</span>}
                  <span>{plugin.downloadCount || 0} installs</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${plugin.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {plugin.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
