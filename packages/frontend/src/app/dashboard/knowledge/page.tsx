'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

export default function KnowledgePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAppId, setNewAppId] = useState('');
  const [creating, setCreating] = useState(false);

  // Document upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Text ingest
  const [showTextForm, setShowTextForm] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textUrl, setTextUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [activeTab, setActiveTab] = useState<'documents' | 'search' | 'settings'>('documents');

  const load = async () => {
    setLoading(true);
    try {
      const [kbs, appList] = await Promise.all([
        api.getKnowledgeBases(),
        api.getApplications().catch(() => []),
      ]);
      setKnowledgeBases(kbs || []);
      setApps(appList || []);
    } catch { setKnowledgeBases([]); }
    finally { setLoading(false); }
  };

  const selectKB = async (kb: any) => {
    setSelected(kb);
    setActiveTab('documents');
    setSearchResults(null);
    try {
      const docs = await api.getKnowledgeDocuments(kb._id);
      setDocuments(docs || []);
    } catch { setDocuments([]); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newAppId) return;
    setCreating(true);
    try {
      const kb = await api.createKnowledgeBase({ name: newName, applicationId: newAppId, description: newDesc });
      setShowCreate(false);
      setNewName(''); setNewDesc(''); setNewAppId('');
      await load();
      selectKB(kb);
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    try {
      await api.uploadKnowledgeDocument(selected._id, file);
      const docs = await api.getKnowledgeDocuments(selected._id);
      setDocuments(docs || []);
      const kbs = await api.getKnowledgeBases();
      setKnowledgeBases(kbs || []);
    } catch (err: any) { alert(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleTextIngest = async () => {
    if (!textTitle.trim() || !textContent.trim() || !selected) return;
    setIngesting(true);
    try {
      await api.addTextDocument(selected._id, { title: textTitle, content: textContent, sourceUrl: textUrl || undefined });
      setShowTextForm(false);
      setTextTitle(''); setTextContent(''); setTextUrl('');
      const docs = await api.getKnowledgeDocuments(selected._id);
      setDocuments(docs || []);
    } catch (err: any) { alert(err.message); }
    finally { setIngesting(false); }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document and all its chunks?')) return;
    try {
      await api.deleteKnowledgeDocument(docId);
      const docs = await api.getKnowledgeDocuments(selected._id);
      setDocuments(docs || []);
    } catch (err: any) { alert(err.message); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selected) return;
    setSearching(true);
    try {
      const results = await api.searchKnowledge(selected._id, searchQuery);
      setSearchResults(results);
    } catch (err: any) { alert(err.message); }
    finally { setSearching(false); }
  };

  const handleDeleteKB = async () => {
    if (!selected || !confirm(`Delete "${selected.name}" and all documents?`)) return;
    try {
      await api.deleteKnowledgeBase(selected._id);
      setSelected(null); setDocuments([]);
      await load();
    } catch (err: any) { alert(err.message); }
  };

  const STATUS_BADGE: Record<string, string> = {
    ready: 'bg-green-100 text-green-700',
    processing: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Bases</h1>
          <p className="text-sm text-slate-500 mt-1">Add documents and data to power RAG for your AI apps</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium">
          + New Knowledge Base
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h3 className="font-medium text-slate-900 mb-3">New Knowledge Base</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Product Documentation" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Application</label>
                <select value={newAppId} onChange={e => setNewAppId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white">
                  <option value="">Select an app...</option>
                  {apps.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What knowledge does this contain?" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!newName.trim() || !newAppId || creating} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm">
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KB List */}
        <div>
          {loading ? (
            <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading...</div>
          ) : knowledgeBases.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-2">📚</span>
              <p className="text-sm">No knowledge bases yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {knowledgeBases.map(kb => (
                <button
                  key={kb._id}
                  onClick={() => selectKB(kb)}
                  className={`w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow ${
                    selected?._id === kb._id ? 'ring-2 ring-brand-500 border-brand-300' : ''
                  }`}
                >
                  <h4 className="font-medium text-slate-900 text-sm">{kb.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{kb.documentCount || 0} docs</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">{kb.totalChunks || 0} chunks</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="md:col-span-3">
          {!selected ? (
            <div className="text-center py-20 text-slate-400">
              <span className="text-5xl block mb-3">📚</span>
              <p className="text-sm">Select a knowledge base to manage documents</p>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                  {selected.description && <p className="text-xs text-slate-500">{selected.description}</p>}
                </div>
                <button onClick={handleDeleteKB} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
                {(['documents', 'search', 'settings'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                    {tab === 'documents' ? `📄 Documents (${documents.length})` : tab === 'search' ? '🔍 Search' : '⚙️ Settings'}
                  </button>
                ))}
              </div>

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div>
                  <div className="flex gap-2 mb-4">
                    <input ref={fileRef} type="file" onChange={handleFileUpload} accept=".txt,.md,.json,.csv,.html,.xml" className="hidden" />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                      {uploading ? 'Uploading...' : '📄 Upload File'}
                    </button>
                    <button onClick={() => setShowTextForm(!showTextForm)} className="text-sm border px-4 py-2 rounded-lg hover:bg-slate-50">
                      ✏️ Add Text
                    </button>
                  </div>

                  {showTextForm && (
                    <div className="bg-slate-50 border rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <input value={textTitle} onChange={e => setTextTitle(e.target.value)} placeholder="Document title" className="px-3 py-2 border rounded-lg text-sm outline-none bg-white" />
                        <input value={textUrl} onChange={e => setTextUrl(e.target.value)} placeholder="Source URL (optional)" className="px-3 py-2 border rounded-lg text-sm outline-none bg-white font-mono" />
                      </div>
                      <textarea value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Paste your content here..." rows={6} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white resize-none mb-2" />
                      <div className="flex gap-2">
                        <button onClick={handleTextIngest} disabled={!textTitle.trim() || !textContent.trim() || ingesting} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                          {ingesting ? 'Processing...' : 'Add Document'}
                        </button>
                        <button onClick={() => setShowTextForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white border rounded-xl">
                      <span className="text-4xl block mb-2">📄</span>
                      <p className="text-sm">No documents yet. Upload files or add text to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc: any) => (
                        <div key={doc._id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{doc.fileType?.includes('text') ? '📝' : '📄'}</span>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{doc.fileName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[doc.status] || 'bg-slate-100'}`}>{doc.status}</span>
                                <span className="text-xs text-slate-400">{doc.chunkCount || 0} chunks</span>
                                <span className="text-xs text-slate-400">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                              </div>
                              {doc.errorMessage && <p className="text-xs text-red-500 mt-1">{doc.errorMessage}</p>}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteDoc(doc._id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search Tab */}
              {activeTab === 'search' && (
                <div>
                  <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search your knowledge base..." className="flex-1 px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                    <button type="submit" disabled={!searchQuery.trim() || searching} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </form>

                  {searchResults && (
                    <div>
                      <p className="text-xs text-slate-400 mb-3">{searchResults.results.length} results for "{searchResults.query}"</p>
                      {searchResults.results.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">No relevant results found.</p>
                      ) : (
                        <div className="space-y-3">
                          {searchResults.results.map((r: any, i: number) => (
                            <div key={i} className="bg-white border rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-400">{r.metadata?.fileName || 'Unknown source'}</span>
                                <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">Score: {(r.score * 100).toFixed(0)}%</span>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.content.slice(0, 500)}{r.content.length > 500 ? '...' : ''}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="font-medium text-slate-900 mb-4">Retrieval Settings</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Chunk Size</label>
                      <p className="text-slate-900">{selected.settings?.chunkSize || 1000} characters</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Chunk Overlap</label>
                      <p className="text-slate-900">{selected.settings?.chunkOverlap || 200} characters</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Embedding Model</label>
                      <p className="text-slate-900 font-mono text-xs">{selected.settings?.embeddingModel || 'text-embedding-3-small'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Top-K Results</label>
                      <p className="text-slate-900">{selected.settings?.retrievalTopK || 5}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t text-xs text-slate-400">
                    <p>Total Documents: {selected.documentCount || 0}</p>
                    <p>Total Chunks: {selected.totalChunks || 0}</p>
                    <p>Created: {new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
