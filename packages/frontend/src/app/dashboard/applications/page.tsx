'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApplications, useCreateApplication, useDeleteApplication } from '@/lib/hooks';

export default function ApplicationsPage() {
  const { data: apps, loading, refetch } = useApplications();
  const { create, loading: creating } = useCreateApplication();
  const { remove, loading: deleting } = useDeleteApplication();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await create({
        name: name.trim(),
        description: description.trim() || undefined,
        config: { aiProvider: provider, aiModel: model, temperature: 0.7 },
      });
      setName('');
      setDescription('');
      setShowCreate(false);
      refetch();
    } catch (err) {
      // error handled by hook
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    setDeleteId(null);
    refetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage your AI-powered applications</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium flex items-center gap-2">
          <span className="text-lg">+</span> New Application
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Application</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Application Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My AI Chatbot" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this app do?" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">AI Provider</label>
                  <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                    {provider === 'openai' ? (
                      <>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    ) : (
                      <>
                        <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
                        <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={handleCreate} disabled={!name.trim() || creating} className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create App'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-2">Delete Application?</h2>
            <p className="text-slate-500 text-sm mb-4">This action cannot be undone. All conversations and data will be permanently deleted.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App List */}
      {loading ? (
        <div className="bg-white rounded-xl border p-12 text-center animate-pulse text-slate-400">Loading applications...</div>
      ) : apps && apps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app: any) => (
            <div key={app.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <span className="text-brand-600 font-bold">{app.name[0]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${app.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {app.status}
                  </span>
                  <button onClick={() => setDeleteId(app.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all" title="Delete">
                    ✕
                  </button>
                </div>
              </div>
              <Link href={`/dashboard/applications/${app.id}`}>
                <h3 className="font-semibold text-slate-900 mb-1 hover:text-brand-600">{app.name}</h3>
              </Link>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{app.description || 'No description'}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{app.config?.aiProvider || 'openai'} / {app.config?.aiModel || 'gpt-4'}</span>
                <span>{new Date(app.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <span className="text-5xl mb-4 block">🚀</span>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No applications yet</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">Create your first AI application to get started.</p>
          <button onClick={() => setShowCreate(true)} className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 font-medium">Create Your First App</button>
        </div>
      )}
    </div>
  );
}
