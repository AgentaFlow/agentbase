'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyAppId, setNewKeyAppId] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [apps, setApps] = useState<any[]>([]);

  const loadKeys = async () => {
    try {
      const data = await api.getApiKeys();
      setKeys(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
    api.getApplications().then(data => setApps(data || [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await api.createApiKey({
        name: newKeyName,
        applicationId: newKeyAppId || undefined,
        rateLimit: newKeyRateLimit,
      });
      setNewRawKey(result.rawKey);
      setNewKeyName('');
      setNewKeyAppId('');
      setNewKeyRateLimit(100);
      await loadKeys();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? It will immediately stop working.')) return;
    try {
      await api.revokeApiKey(id);
      await loadKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this API key?')) return;
    try {
      await api.deleteApiKey(id);
      await loadKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading API keys...</div>;
  }

  return (
    <div>
      {/* New key created banner */}
      {newRawKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-800 mb-1">API Key Created Successfully</p>
              <p className="text-xs text-green-600 mb-2">
                Copy this key now — it won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-green-100 text-green-900 px-3 py-1.5 rounded-lg text-xs font-mono break-all">
                  {newRawKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newRawKey)}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
            </div>
            <button onClick={() => setNewRawKey(null)} className="text-green-500 hover:text-green-700 text-lg">
              &times;
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          API keys authenticate requests to the Public API and embeddable widget.
        </p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium"
        >
          + Create Key
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <h4 className="font-medium text-slate-900 mb-3">Create API Key</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Widget Key"
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Scope to Application (optional)</label>
              <select
                value={newKeyAppId}
                onChange={(e) => setNewKeyAppId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white"
              >
                <option value="">All applications</option>
                {apps.map(app => (
                  <option key={app.id} value={app.id}>{app.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Rate Limit (requests/min): {newKeyRateLimit}
              </label>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={newKeyRateLimit}
                onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>10/min</span>
                <span>1000/min</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={!newKeyName.trim() || creating}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm"
              >
                {creating ? 'Creating...' : 'Create API Key'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <span className="text-4xl block mb-3">🔑</span>
          <p className="text-sm">No API keys yet</p>
          <p className="text-xs mt-1">Create an API key to use the Public API or embed the chat widget</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <div key={key.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-900 text-sm">{key.name}</h4>
                    <code className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                      {key.keyPrefix}
                    </code>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{key.rateLimit}/min</span>
                    <span>{key.scopes?.join(', ')}</span>
                    {key.lastUsedAt && <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                    <span>{key.totalRequests || 0} requests</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {key.isActive ? (
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="text-xs px-3 py-1.5 border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50"
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-xs text-red-500 font-medium px-2">Revoked</span>
                )}
                <button
                  onClick={() => handleDelete(key.id)}
                  className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
