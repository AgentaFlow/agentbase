'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  verifying: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
};

export default function CustomDomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [selectedDns, setSelectedDns] = useState<any>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setDomains(await api.getCustomDomains()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    try {
      const result = await api.addCustomDomain({ domain: newDomain.trim() });
      setDomains(prev => [result, ...prev]);
      setNewDomain('');
      setAdding(false);
      if (result.dnsInstructions) setSelectedDns(result.dnsInstructions);
    } catch (err: any) {
      alert(err.message || 'Failed to add domain');
    }
  };

  const verify = async (id: string) => {
    setVerifying(id);
    try {
      const result = await api.verifyDomain(id);
      if (result.verified) {
        load();
      } else {
        alert(result.error || 'Verification failed. Check your DNS records.');
      }
    } catch { alert('Verification check failed'); }
    setVerifying(null);
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this domain?')) return;
    try {
      await api.deleteDomain(id);
      setDomains(prev => prev.filter(d => d.id !== id));
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Custom Domains</h1>
          <p className="text-sm text-slate-500 mt-1">Serve your AI applications from your own domain</p>
        </div>
        <button onClick={() => setAdding(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          Add Domain
        </button>
      </div>

      {/* Add Domain Form */}
      {adding && (
        <div className="bg-white border rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">Add Custom Domain</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="chat.yourdomain.com"
              className="flex-1 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
              onKeyDown={e => e.key === 'Enter' && addDomain()}
            />
            <button onClick={addDomain} className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
              Add
            </button>
            <button onClick={() => { setAdding(false); setNewDomain(''); }} className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* DNS Instructions Modal */}
      {selectedDns && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-blue-900 mb-3">DNS Configuration Required</h3>
            <button onClick={() => setSelectedDns(null)} className="text-blue-400 hover:text-blue-600 text-xl leading-none">&times;</button>
          </div>
          <p className="text-sm text-blue-700 mb-4">Add one of these DNS records to verify your domain:</p>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Option 1: CNAME Record (Recommended)</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-xs text-slate-400">Type</span><br/><code className="font-mono">{selectedDns.cname.type}</code></div>
                <div><span className="text-xs text-slate-400">Host</span><br/><code className="font-mono text-xs break-all">{selectedDns.cname.host}</code></div>
                <div><span className="text-xs text-slate-400">Value</span><br/><code className="font-mono text-xs break-all">{selectedDns.cname.value}</code></div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Option 2: TXT Record</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-xs text-slate-400">Type</span><br/><code className="font-mono">{selectedDns.txt.type}</code></div>
                <div><span className="text-xs text-slate-400">Host</span><br/><code className="font-mono text-xs break-all">{selectedDns.txt.host}</code></div>
                <div><span className="text-xs text-slate-400">Value</span><br/><code className="font-mono text-xs break-all">{selectedDns.txt.value}</code></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain List */}
      {loading ? (
        <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading domains...</div>
      ) : domains.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white border rounded-xl">
          <span className="text-5xl block mb-3">🌐</span>
          <p className="font-medium text-slate-600">No custom domains yet</p>
          <p className="text-sm mt-1">Add a domain to serve your AI apps from your own URL</p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map(d => (
            <div key={d.id} className="bg-white border rounded-xl p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌐</span>
                  <h3 className="font-semibold text-slate-900">{d.domain}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[d.status] || 'bg-slate-100 text-slate-600'}`}>
                    {d.status}
                  </span>
                  {d.sslEnabled && <span className="text-xs text-green-600 font-medium">🔒 SSL</span>}
                </div>
                {d.application && (
                  <p className="text-xs text-slate-400 mt-1 ml-9">Linked to: {d.application.name}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {(d.status === 'pending' || d.status === 'failed') && (
                  <>
                    <button
                      onClick={async () => {
                        const dns = await api.getDomainDns(d.id);
                        setSelectedDns(dns);
                      }}
                      className="text-xs px-3 py-1.5 border rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      DNS Setup
                    </button>
                    <button
                      onClick={() => verify(d.id)}
                      disabled={verifying === d.id}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {verifying === d.id ? 'Checking...' : 'Verify'}
                    </button>
                  </>
                )}
                <button onClick={() => remove(d.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
