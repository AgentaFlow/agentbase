'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

const DEFAULT_COLORS = {
  primaryColor: '#4F46E5',
  secondaryColor: '#7C3AED',
  accentColor: '#06B6D4',
  backgroundColor: '#FFFFFF',
  textColor: '#1E293B',
};

export default function BrandingPage() {
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'widget' | 'email' | 'css'>('colors');

  const load = async () => {
    setLoading(true);
    try { setBranding(await api.getBranding()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateBranding(branding);
      setBranding(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('Failed to save'); }
    setSaving(false);
  };

  const update = (key: string, value: any) => {
    setBranding((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateWidget = (key: string, value: any) => {
    setBranding((prev: any) => ({
      ...prev,
      widgetConfig: { ...prev.widgetConfig, [key]: value },
    }));
  };

  const updateEmail = (key: string, value: any) => {
    setBranding((prev: any) => ({
      ...prev,
      emailConfig: { ...prev.emailConfig, [key]: value },
    }));
  };

  if (loading) return <div className="animate-pulse text-slate-400 py-8 text-center text-sm">Loading branding settings...</div>;
  if (!branding) return <div className="text-center py-16 text-slate-400">Failed to load branding</div>;

  const tabs = [
    { key: 'colors' as const, label: 'Colors & Fonts', icon: '🎨' },
    { key: 'widget' as const, label: 'Widget', icon: '💬' },
    { key: 'email' as const, label: 'Emails', icon: '📧' },
    { key: 'css' as const, label: 'Custom CSS', icon: '🖌️' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branding</h1>
          <p className="text-sm text-slate-500 mt-1">Customize the look and feel of your AI applications</p>
        </div>
        <div className="flex gap-3 items-center">
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Colors & Fonts Tab */}
      {activeTab === 'colors' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Identity</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Company Name</label>
                <input type="text" value={branding.companyName || ''} onChange={e => update('companyName', e.target.value)}
                  placeholder="Your Company" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Logo URL</label>
                <input type="url" value={branding.logoUrl || ''} onChange={e => update('logoUrl', e.target.value)}
                  placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Favicon URL</label>
                <input type="url" value={branding.faviconUrl || ''} onChange={e => update('faviconUrl', e.target.value)}
                  placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Colors</h3>
            <div className="space-y-3">
              {Object.entries(DEFAULT_COLORS).map(([key, fallback]) => (
                <div key={key} className="flex items-center gap-3">
                  <input type="color" value={(branding as any)[key] || fallback}
                    onChange={e => update(key, e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-500 capitalize">{key.replace('Color', ' Color')}</label>
                    <input type="text" value={(branding as any)[key] || fallback}
                      onChange={e => update(key, e.target.value)}
                      className="block w-full px-2 py-1 border rounded text-xs font-mono mt-0.5 outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Typography</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Body Font</label>
                <input type="text" value={branding.fontFamily || ''} onChange={e => update('fontFamily', e.target.value)}
                  placeholder="Inter, sans-serif" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Heading Font</label>
                <input type="text" value={branding.headingFont || ''} onChange={e => update('headingFont', e.target.value)}
                  placeholder="Inter, sans-serif" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Branding Options</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={branding.showPoweredBy !== false}
                onChange={e => update('showPoweredBy', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300" />
              <div>
                <p className="text-sm font-medium text-slate-700">Show "Powered by Agentbase"</p>
                <p className="text-xs text-slate-400">Displayed in the widget footer. Pro+ plans can disable this.</p>
              </div>
            </label>
          </div>

          {/* Live Preview */}
          <div className="col-span-2 bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Preview</h3>
            <div className="rounded-xl border overflow-hidden" style={{
              backgroundColor: branding.backgroundColor || '#FFFFFF',
              fontFamily: branding.fontFamily || 'Inter, sans-serif',
            }}>
              <div className="px-6 py-4" style={{ backgroundColor: branding.primaryColor || '#4F46E5' }}>
                <h4 className="text-white font-semibold" style={{ fontFamily: branding.headingFont || branding.fontFamily || 'Inter, sans-serif' }}>
                  {branding.companyName || 'Your Company'} AI Assistant
                </h4>
              </div>
              <div className="p-6" style={{ color: branding.textColor || '#1E293B' }}>
                <p className="text-sm mb-3">Hello! How can I help you today?</p>
                <div className="flex gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: branding.accentColor || '#06B6D4', color: 'white' }}>
                    Get started
                  </span>
                  <span className="text-xs px-3 py-1.5 rounded-full border" style={{ borderColor: branding.secondaryColor || '#7C3AED', color: branding.secondaryColor || '#7C3AED' }}>
                    Learn more
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Tab */}
      {activeTab === 'widget' && (
        <div className="bg-white border rounded-xl p-6 max-w-xl">
          <h3 className="font-semibold text-slate-900 mb-4">Widget Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Position</label>
              <select value={branding.widgetConfig?.position || 'bottom-right'}
                onChange={e => updateWidget('position', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Border Radius (px)</label>
              <input type="number" value={branding.widgetConfig?.borderRadius ?? 16}
                onChange={e => updateWidget('borderRadius', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Welcome Message</label>
              <input type="text" value={branding.widgetConfig?.welcomeMessage || ''}
                onChange={e => updateWidget('welcomeMessage', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Input Placeholder</label>
              <input type="text" value={branding.widgetConfig?.placeholder || ''}
                onChange={e => updateWidget('placeholder', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Header Text</label>
              <input type="text" value={branding.widgetConfig?.headerText || ''}
                onChange={e => updateWidget('headerText', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Avatar URL</label>
              <input type="url" value={branding.widgetConfig?.avatarUrl || ''}
                onChange={e => updateWidget('avatarUrl', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="bg-white border rounded-xl p-6 max-w-xl">
          <h3 className="font-semibold text-slate-900 mb-4">Email Branding</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From Name</label>
              <input type="text" value={branding.emailConfig?.fromName || ''}
                onChange={e => updateEmail('fromName', e.target.value)}
                placeholder="Your Company" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reply-To</label>
              <input type="email" value={branding.emailConfig?.replyTo || ''}
                onChange={e => updateEmail('replyTo', e.target.value)}
                placeholder="support@yourdomain.com" className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Header Logo URL</label>
              <input type="url" value={branding.emailConfig?.headerLogoUrl || ''}
                onChange={e => updateEmail('headerLogoUrl', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Footer Text</label>
              <textarea value={branding.emailConfig?.footerText || ''}
                onChange={e => updateEmail('footerText', e.target.value)}
                rows={3} className="w-full px-3 py-2 border rounded-lg text-sm outline-none resize-none" />
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS Tab */}
      {activeTab === 'css' && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Custom CSS</h3>
          <p className="text-xs text-slate-400 mb-4">Inject custom CSS into your widget and public-facing pages. Available CSS variables: --ab-primary, --ab-secondary, --ab-accent, --ab-bg, --ab-text, --ab-font.</p>
          <textarea
            value={branding.customCss || ''}
            onChange={e => update('customCss', e.target.value)}
            rows={16}
            placeholder={`.agentbase-widget {\n  /* Your custom styles */\n}`}
            className="w-full px-4 py-3 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500 resize-y"
          />
        </div>
      )}
    </div>
  );
}
