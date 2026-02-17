'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface PluginManagerProps {
  applicationId: string;
}

export default function PluginManager({ applicationId }: PluginManagerProps) {
  const [marketplacePlugins, setMarketplacePlugins] = useState<any[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const [marketplace, installed] = await Promise.all([
        api.getPlugins().catch(() => []),
        api.getInstalledPlugins(applicationId).catch(() => []),
      ]);
      setMarketplacePlugins(marketplace || []);
      setInstalledPlugins(installed || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlugins(); }, [applicationId]);

  const installedIds = new Set(installedPlugins.map((p: any) => p.pluginId || p.plugin?.id));

  const handleInstall = async (pluginId: string) => {
    setActionLoading(pluginId);
    try {
      await api.installPlugin(applicationId, pluginId);
      await loadPlugins();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (pluginId: string) => {
    setActionLoading(pluginId);
    try {
      await api.activatePlugin(applicationId, pluginId);
      await loadPlugins();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (pluginId: string) => {
    setActionLoading(pluginId);
    try {
      await api.deactivatePlugin(applicationId, pluginId);
      await loadPlugins();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) return;
    setActionLoading(pluginId);
    try {
      await api.uninstallPlugin(applicationId, pluginId);
      await loadPlugins();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading plugins...</div>;
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b">
        <button onClick={() => setActiveTab('installed')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'installed' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Installed ({installedPlugins.length})
        </button>
        <button onClick={() => setActiveTab('marketplace')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'marketplace' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Marketplace ({marketplacePlugins.length})
        </button>
      </div>

      {/* Installed */}
      {activeTab === 'installed' && (
        <div>
          {installedPlugins.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-3">🧩</span>
              <p className="text-sm">No plugins installed yet</p>
              <button onClick={() => setActiveTab('marketplace')} className="text-brand-600 text-sm mt-2 hover:underline">
                Browse marketplace
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {installedPlugins.map((ip: any) => {
                const plugin = ip.plugin || ip;
                const isActive = ip.isActive ?? true;
                const pluginId = ip.pluginId || plugin.id;
                return (
                  <div key={pluginId} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-lg">🧩</div>
                      <div>
                        <h4 className="font-medium text-slate-900 text-sm">{plugin.name || 'Plugin'}</h4>
                        <p className="text-xs text-slate-500">{plugin.version || '1.0.0'} · {isActive ? '🟢 Active' : '🔴 Inactive'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <button onClick={() => handleDeactivate(pluginId)} disabled={actionLoading === pluginId} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50">
                          Deactivate
                        </button>
                      ) : (
                        <button onClick={() => handleActivate(pluginId)} disabled={actionLoading === pluginId} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                          Activate
                        </button>
                      )}
                      <button onClick={() => handleUninstall(pluginId)} disabled={actionLoading === pluginId} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                        Uninstall
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Marketplace */}
      {activeTab === 'marketplace' && (
        <div>
          {marketplacePlugins.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-3">📦</span>
              <p className="text-sm">No plugins available in the marketplace yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketplacePlugins.map((plugin: any) => {
                const isInstalled = installedIds.has(plugin.id);
                return (
                  <div key={plugin.id} className="bg-white border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-brand-200 rounded-lg flex items-center justify-center text-lg">🧩</div>
                        <div>
                          <h4 className="font-medium text-slate-900 text-sm">{plugin.name}</h4>
                          <p className="text-xs text-slate-500">{plugin.version || '1.0.0'} · ⬇ {plugin.downloadCount || 0}</p>
                        </div>
                      </div>
                      {plugin.isPaid && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">${plugin.price}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">{plugin.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={`text-xs ${star <= (plugin.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                        ))}
                      </div>
                      {isInstalled ? (
                        <span className="text-xs text-green-600 font-medium px-3 py-1.5">✓ Installed</span>
                      ) : (
                        <button onClick={() => handleInstall(plugin.id)} disabled={actionLoading === plugin.id} className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                          {actionLoading === plugin.id ? 'Installing...' : 'Install'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
