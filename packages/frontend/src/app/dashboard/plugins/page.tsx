export default function PluginsPage() {
  const mockPlugins = [
    { name: 'AI Chat Widget', slug: 'ai-chat', author: 'Agentbase', desc: 'Embeddable chat interface for your AI apps', version: '1.0.0' },
    { name: 'Content Generator', slug: 'content-gen', author: 'Agentbase', desc: 'Generate blog posts, emails, and more', version: '1.0.0' },
    { name: 'RAG Knowledge Base', slug: 'rag-kb', author: 'Agentbase', desc: 'Upload documents and query them with AI', version: '0.9.0' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Plugins</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockPlugins.map((plugin) => (
          <div key={plugin.slug} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                <span className="text-brand-600 font-bold text-sm">🧩</span>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">v{plugin.version}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{plugin.name}</h3>
            <p className="text-sm text-slate-500 mb-3">{plugin.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">by {plugin.author}</span>
              <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">Install</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
