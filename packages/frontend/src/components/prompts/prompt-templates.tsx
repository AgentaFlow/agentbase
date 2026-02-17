'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface PromptTemplatesProps {
  applicationId: string;
  onSelectPrompt?: (template: string) => void;
}

interface PromptTemplate {
  _id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
  isDefault: boolean;
}

export default function PromptTemplates({ applicationId, onSelectPrompt }: PromptTemplatesProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formTemplate, setFormTemplate] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  const loadTemplates = async () => {
    try {
      const data = await api.getPromptTemplates(applicationId);
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, [applicationId]);

  const extractVariables = (template: string): string[] => {
    const matches = template.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const resetForm = () => {
    setFormName(''); setFormTemplate(''); setFormDescription('');
    setShowCreate(false); setEditId(null);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formTemplate.trim()) return;
    setSaving(true);
    const variables = extractVariables(formTemplate);
    try {
      if (editId) {
        await api.updatePromptTemplate(editId, { name: formName, template: formTemplate, variables, description: formDescription });
      } else {
        await api.createPromptTemplate({ applicationId, name: formName, template: formTemplate, variables, description: formDescription });
      }
      resetForm();
      await loadTemplates();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (t: PromptTemplate) => {
    setEditId(t._id); setFormName(t.name); setFormTemplate(t.template);
    setFormDescription(t.description || ''); setShowCreate(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt template?')) return;
    try { await api.deletePromptTemplate(id); await loadTemplates(); }
    catch (err: any) { alert(err.message); }
  };

  const handleSetDefault = async (id: string) => {
    try { await api.setDefaultPromptTemplate(id, applicationId); await loadTemplates(); }
    catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading templates...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Manage reusable prompt templates with {'{{variable}}'} support.</p>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium">+ New Template</button>
      </div>

      {showCreate && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <h4 className="font-medium text-slate-900 mb-3">{editId ? 'Edit' : 'Create'} Prompt Template</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Customer Support Bot" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
              <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Template <span className="text-slate-400">(use {'{{variable_name}}'} for dynamic values)</span></label>
              <textarea value={formTemplate} onChange={(e) => setFormTemplate(e.target.value)} placeholder="You are a helpful {{role}} for {{company_name}}." className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono" rows={5} />
              {formTemplate && <div className="mt-1 text-xs text-slate-400">Variables: {extractVariables(formTemplate).join(', ') || 'none'}</div>}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={!formName.trim() || !formTemplate.trim() || saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
              <button onClick={resetForm} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {templates.length === 0 && !showCreate ? (
        <div className="text-center py-12 text-slate-400">
          <span className="text-4xl block mb-3">📝</span>
          <p className="text-sm">No prompt templates yet</p>
          <p className="text-xs mt-1">Create templates with variables for quick prompt setup</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t._id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-900 text-sm">{t.name}</h4>
                    {t.isDefault && <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">DEFAULT</span>}
                  </div>
                  {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {onSelectPrompt && <button onClick={() => onSelectPrompt(t.template)} className="text-xs px-2 py-1 bg-brand-50 text-brand-600 rounded hover:bg-brand-100">Use</button>}
                  {!t.isDefault && <button onClick={() => handleSetDefault(t._id)} className="text-xs px-2 py-1 text-slate-500 rounded hover:bg-slate-100" title="Set as default">★</button>}
                  <button onClick={() => setPreviewId(previewId === t._id ? null : t._id)} className="text-xs px-2 py-1 text-slate-500 rounded hover:bg-slate-100">Preview</button>
                  <button onClick={() => handleEdit(t)} className="text-xs px-2 py-1 text-slate-500 rounded hover:bg-slate-100">Edit</button>
                  <button onClick={() => handleDelete(t._id)} className="text-xs px-2 py-1 text-red-500 rounded hover:bg-red-50">Delete</button>
                </div>
              </div>
              <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                {t.template.length > 200 ? t.template.slice(0, 200) + '...' : t.template}
              </pre>
              {t.variables.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.variables.map(v => <span key={v} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{`{{${v}}}`}</span>)}
                </div>
              )}
              {previewId === t._id && t.variables.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-slate-600 mb-2">Preview with values:</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {t.variables.map(v => <input key={v} placeholder={v} value={previewVars[v] || ''} onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })} className="px-2 py-1.5 border rounded text-xs outline-none focus:ring-1 focus:ring-brand-500" />)}
                  </div>
                  <pre className="text-xs text-green-800 bg-green-50 p-3 rounded-lg whitespace-pre-wrap font-mono">
                    {t.variables.reduce((str, v) => str.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), previewVars[v] || `{{${v}}}`), t.template)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
