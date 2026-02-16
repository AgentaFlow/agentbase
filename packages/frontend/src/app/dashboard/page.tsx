export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Applications', value: '0', icon: '🚀' },
          { label: 'Active Plugins', value: '0', icon: '🧩' },
          { label: 'Conversations', value: '0', icon: '💬' },
          { label: 'API Calls', value: '0', icon: '📡' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-brand-300 hover:bg-brand-50 transition-colors">
            <span className="text-3xl mb-2 block">🚀</span>
            <span className="font-medium text-slate-700">Create App</span>
            <p className="text-sm text-slate-500 mt-1">
              Launch a new AI application
            </p>
          </button>
          <button className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-brand-300 hover:bg-brand-50 transition-colors">
            <span className="text-3xl mb-2 block">🧩</span>
            <span className="font-medium text-slate-700">Browse Plugins</span>
            <p className="text-sm text-slate-500 mt-1">
              Extend your apps with plugins
            </p>
          </button>
          <button className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-brand-300 hover:bg-brand-50 transition-colors">
            <span className="text-3xl mb-2 block">📖</span>
            <span className="font-medium text-slate-700">Read Docs</span>
            <p className="text-sm text-slate-500 mt-1">
              Learn how to build with Agentbase
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
