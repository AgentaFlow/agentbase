export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <div className="space-y-6 max-w-2xl">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" className="w-full px-3 py-2 border rounded-lg bg-slate-50" disabled />
            </div>
            <button className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium">
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">AI Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">OpenAI API Key</label>
              <input type="password" placeholder="sk-..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Anthropic API Key</label>
              <input type="password" placeholder="sk-ant-..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <button className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium">
              Save Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
