'use client';

import { useState } from 'react';

export default function ApplicationsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium"
        >
          + New Application
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Application</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="My AI App"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={appDesc}
                  onChange={(e) => setAppDesc(e.target.value)}
                  placeholder="Describe your application..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      <div className="bg-white rounded-xl border p-12 text-center">
        <span className="text-5xl mb-4 block">🚀</span>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          No applications yet
        </h2>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Create your first AI application to get started. Each app gets its own
          AI configuration, plugins, and theme.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 font-medium"
        >
          Create Your First App
        </button>
      </div>
    </div>
  );
}
