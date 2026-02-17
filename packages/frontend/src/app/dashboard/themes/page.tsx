'use client';

import { useState } from 'react';
import { useThemes } from '@/lib/hooks';

export default function ThemesPage() {
  const { data: themes, loading } = useThemes();
  const [previewTheme, setPreviewTheme] = useState<any>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Theme Gallery</h1>

      {loading ? (
        <div className="animate-pulse text-slate-400 py-12 text-center">Loading themes...</div>
      ) : (themes || []).length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <span className="text-5xl block mb-4">🎨</span>
          <h3 className="text-lg font-semibold mb-2">No themes available</h3>
          <p className="text-slate-500 text-sm">Themes will appear here once published to the gallery.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(themes || []).map((theme: any) => {
            const styles = theme.defaultStyles || {};
            return (
              <div key={theme.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
                {/* Color preview */}
                <div className="h-28 relative" style={{ background: styles.primaryColor || '#6366f1' }}>
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {[styles.primaryColor, styles.secondaryColor, styles.accentColor].filter(Boolean).map((color: string, i: number) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-slate-900">{theme.name}</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">v{theme.version}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{theme.description || 'No description'}</p>
                  <div className="flex items-center justify-between">
                    {theme.isPaid ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">${theme.price}</span>
                    ) : (
                      <span className="text-xs text-green-600">Free</span>
                    )}
                    <button onClick={() => setPreviewTheme(theme)} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTheme && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreviewTheme(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-32" style={{ background: previewTheme.defaultStyles?.primaryColor || '#6366f1' }} />
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{previewTheme.name}</h3>
              <p className="text-slate-500 text-sm mb-4">{previewTheme.description}</p>

              <h4 className="text-sm font-medium text-slate-700 mb-2">Color Palette</h4>
              <div className="flex gap-3 mb-4">
                {Object.entries(previewTheme.defaultStyles || {}).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="w-12 h-12 rounded-lg border shadow-sm mb-1" style={{ backgroundColor: value as string }} />
                    <p className="text-xs text-slate-500">{key.replace('Color', '')}</p>
                  </div>
                ))}
              </div>

              {/* Chat preview */}
              <h4 className="text-sm font-medium text-slate-700 mb-2">Chat Preview</h4>
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-end">
                  <div className="rounded-xl px-3 py-2 text-sm text-white" style={{ backgroundColor: previewTheme.defaultStyles?.primaryColor || '#6366f1' }}>
                    Hello, how can you help me?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-xl px-3 py-2 text-sm bg-slate-100 text-slate-800">
                    I&apos;d be happy to help! What do you need?
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <button onClick={() => setPreviewTheme(null)} className="px-4 py-2 text-sm text-slate-500">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
