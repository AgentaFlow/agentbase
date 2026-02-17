'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';

export default function ExportsPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [exportConfig, setExportConfig] = useState({
    resource: 'all',
    format: 'json',
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.exportData(exportConfig.resource, exportConfig.format);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || `agentbase-export.${exportConfig.format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
    setExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.importData(file);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({ error: err.message || 'Import failed' });
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Data Export & Import</h1>
      <p className="text-sm text-slate-500 mb-8">Export your data for backup or migration, or import data from another instance</p>

      <div className="grid grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📤</span>
            <h2 className="text-lg font-semibold text-slate-900">Export Data</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">What to export</label>
              <select value={exportConfig.resource} onChange={e => setExportConfig(c => ({ ...c, resource: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500">
                <option value="all">Everything (Full Backup)</option>
                <option value="applications">Applications Only</option>
                <option value="conversations">Conversations Only</option>
                <option value="analytics">Analytics Data</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Format</label>
              <div className="flex gap-3">
                {['json', 'csv'].map(fmt => (
                  <label key={fmt} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                    exportConfig.format === fmt ? 'border-brand-500 bg-brand-50 text-brand-700' : 'hover:bg-slate-50'
                  }`}>
                    <input type="radio" name="format" value={fmt} checked={exportConfig.format === fmt}
                      onChange={e => setExportConfig(c => ({ ...c, format: e.target.value }))} className="sr-only" />
                    <span className="text-sm font-medium">{fmt.toUpperCase()}</span>
                    <span className="text-xs text-slate-400">{fmt === 'json' ? '(structured)' : '(tabular)'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleExport} disabled={exporting}
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {exporting ? 'Preparing download...' : 'Download Export'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📥</span>
            <h2 className="text-lg font-semibold text-slate-900">Import Data</h2>
          </div>

          <p className="text-sm text-slate-500 mb-4">Import applications from a JSON export file. Imported apps will be created as drafts.</p>

          <div className="border-2 border-dashed rounded-xl p-8 text-center mb-4 hover:border-brand-300 transition-colors">
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" id="import-file" />
            <label htmlFor="import-file" className="cursor-pointer">
              <span className="text-4xl block mb-2">📁</span>
              <p className="text-sm font-medium text-slate-600">
                {importing ? 'Importing...' : 'Click to select a JSON file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports Agentbase export format</p>
            </label>
          </div>

          {importResult && (
            <div className={`rounded-lg p-4 text-sm ${importResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {importResult.error ? (
                <p>Error: {importResult.error}</p>
              ) : (
                <>
                  <p className="font-medium">Import complete!</p>
                  <p className="mt-1">{importResult.imported} application(s) imported</p>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-amber-700 font-medium">{importResult.errors.length} error(s):</p>
                      {importResult.errors.map((err: string, i: number) => (
                        <p key={i} className="text-xs text-amber-600 mt-0.5">{err}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data Info */}
      <div className="mt-8 bg-slate-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-700 mb-3">About your data</h3>
        <div className="grid grid-cols-3 gap-6 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-700">Exports include</p>
            <p className="text-xs text-slate-400 mt-1">Application configs, conversation histories, analytics events, and metadata. Exports never include passwords, API keys, or billing information.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Data portability</p>
            <p className="text-xs text-slate-400 mt-1">JSON exports are fully portable and can be re-imported to any Agentbase instance. CSV exports are great for analysis in spreadsheets.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">Limits</p>
            <p className="text-xs text-slate-400 mt-1">Conversation exports are limited to the most recent 10,000 records per application. Contact support for larger exports.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
