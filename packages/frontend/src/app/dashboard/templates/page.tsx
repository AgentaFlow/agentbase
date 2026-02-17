'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const CATEGORY_ICONS: Record<string, string> = {
  chatbot: '💬', assistant: '🤖', agent: '🧠', workflow: '⚡', rag: '📚', custom: '🔧',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        api.browseTemplates({ category: category || undefined, search: search || undefined }),
        api.getTemplateCategories(),
      ]);
      setTemplates(data.templates || []);
      setCategories(cats || []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [category, search]);

  const handleDeploy = async (templateId: string) => {
    setDeploying(true);
    try {
      const result = await api.deployTemplate(templateId);
      setDeployResult(result);
    } catch (err: any) { alert(err.message); }
    finally { setDeploying(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">App Templates</h1>
        <p className="text-sm text-slate-500 mt-1">Start with a pre-built template and customize for your use case</p>
      </div>

      {/* Deploy Success Banner */}
      {deployResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">Template ready to deploy!</p>
            <p className="text-xs text-green-600">Create a new application with the "{deployResult.name}" configuration.</p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/applications" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Create App</a>
            <button onClick={() => setDeployResult(null)} className="text-xs text-green-600 hover:underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Search + Category Filter */}
      <div className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="flex-1 px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setCategory('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!category ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          All
        </button>
        {categories.map((cat: any) => (
          <button key={cat.key} onClick={() => setCategory(cat.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === cat.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Detail View */}
      {selected ? (
        <div className="mb-6">
          <button onClick={() => setSelected(null)} className="text-sm text-brand-600 hover:underline mb-4 inline-block">← Back to templates</button>
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selected.icon || CATEGORY_ICONS[selected.category]}</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{selected.category}</span>
                    {selected.minPlan !== 'free' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{selected.minPlan}+</span>
                    )}
                    <span className="text-xs text-slate-400">{selected.deployCount || 0} deploys</span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDeploy(selected._id)} disabled={deploying} className="bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {deploying ? 'Deploying...' : 'Use Template'}
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">{selected.description}</p>

            {selected.tags?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-4">
                {selected.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Configuration</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-slate-400">Model:</span> <span className="text-slate-700 font-mono">{selected.config?.model || '-'}</span></div>
                <div><span className="text-slate-400">Temperature:</span> <span className="text-slate-700">{selected.config?.temperature ?? '-'}</span></div>
                <div><span className="text-slate-400">Max Tokens:</span> <span className="text-slate-700">{selected.config?.maxTokens || '-'}</span></div>
                <div><span className="text-slate-400">Knowledge Base:</span> <span className="text-slate-700">{selected.config?.knowledgeBaseEnabled ? 'Yes' : 'No'}</span></div>
              </div>
              {selected.config?.systemPrompt && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-xs text-slate-400">System Prompt:</span>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap bg-white p-2 rounded border">{selected.config.systemPrompt}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Template Grid */
        loading ? (
          <div className="animate-pulse text-slate-400 py-12 text-center text-sm">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="text-sm">No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t: any) => (
              <button
                key={t._id}
                onClick={() => setSelected(t)}
                className="bg-white border rounded-xl p-5 text-left hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{t.icon || CATEGORY_ICONS[t.category]}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{t.name}</h3>
                    <span className="text-xs text-slate-400">{t.category}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{t.shortDescription || t.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {t.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">{t.deployCount || 0} deploys</span>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
