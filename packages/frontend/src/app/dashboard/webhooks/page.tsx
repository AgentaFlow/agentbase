'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['message.sent', 'conversation.started']);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const load = async () => {
    try {
      const [hooks, events] = await Promise.all([
        api.getWebhooks(),
        api.getWebhookEvents(),
      ]);
      setWebhooks(hooks || []);
      setAvailableEvents(events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setCreating(true);
    try {
      const result = await api.createWebhook({ name: newName, url: newUrl, events: newEvents });
      setNewSecret(result.secret);
      setNewName(''); setNewUrl(''); setNewEvents(['message.sent', 'conversation.started']);
      await load();
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleWebhook(id);
      await load();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.deleteWebhook(id);
      await load();
    } catch (err: any) { alert(err.message); }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const result = await api.testWebhook(id);
      if (result.success) {
        alert('Ping sent successfully!');
      } else {
        alert(`Test failed: ${result.error}`);
      }
      await load();
    } catch (err: any) { alert(err.message); }
    finally { setTesting(null); }
  };

  const toggleEvent = (event: string) => {
    setNewEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-sm text-slate-500 mt-1">Receive real-time notifications when events happen in your applications</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium"
        >
          + Create Webhook
        </button>
      </div>

      {/* Secret banner */}
      {newSecret && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-800 mb-1">Webhook Created — Save Your Signing Secret</p>
              <p className="text-xs text-green-600 mb-2">Use this secret to verify webhook payloads. It won't be shown again.</p>
              <code className="bg-green-100 text-green-900 px-3 py-1.5 rounded-lg text-xs font-mono break-all block">
                {newSecret}
              </code>
            </div>
            <button onClick={() => setNewSecret(null)} className="text-green-500 text-lg">&times;</button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h3 className="font-medium text-slate-900 mb-3">New Webhook</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Slack Notifications" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {availableEvents.map(event => (
                  <button
                    key={event}
                    onClick={() => toggleEvent(event)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      newEvents.includes(event)
                        ? 'bg-brand-50 border-brand-300 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={!newName.trim() || !newUrl.trim() || creating} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm">
                {creating ? 'Creating...' : 'Create Webhook'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading webhooks...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="text-5xl block mb-3">🔗</span>
          <p className="text-sm">No webhooks configured</p>
          <p className="text-xs mt-1">Create a webhook to start receiving event notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(hook => (
            <div key={hook.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${hook.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">{hook.name}</h4>
                    <p className="text-xs text-slate-400 font-mono truncate max-w-md">{hook.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(hook.id)}
                    disabled={testing === hook.id}
                    className="text-xs px-3 py-1.5 border rounded-lg hover:bg-slate-50 text-slate-600"
                  >
                    {testing === hook.id ? 'Pinging...' : 'Test'}
                  </button>
                  <button
                    onClick={() => handleToggle(hook.id)}
                    className={`text-xs px-3 py-1.5 border rounded-lg ${hook.isActive ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                  >
                    {hook.isActive ? 'Pause' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(hook.id)}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {hook.events?.map((e: string) => (
                  <span key={e} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{e}</span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{hook.totalDeliveries} deliveries</span>
                {hook.failedDeliveries > 0 && <span className="text-red-400">{hook.failedDeliveries} failed</span>}
                {hook.lastTriggeredAt && <span>Last: {new Date(hook.lastTriggeredAt).toLocaleString()}</span>}
                {hook.lastError && <span className="text-red-400">Error: {hook.lastError}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
