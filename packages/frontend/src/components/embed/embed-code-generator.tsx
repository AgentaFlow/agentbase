'use client';

import { useState, useMemo } from 'react';

interface EmbedCodeGeneratorProps {
  applicationId: string;
  appName: string;
  appSlug?: string;
}

const THEMES = [
  { value: 'default', label: 'Default', color: '#4F46E5' },
  { value: 'dark', label: 'Dark', color: '#818CF8' },
  { value: 'minimal', label: 'Minimal', color: '#171717' },
  { value: 'vibrant', label: 'Vibrant', color: '#EC4899' },
];

const POSITIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
];

export default function EmbedCodeGenerator({ applicationId, appName, appSlug }: EmbedCodeGeneratorProps) {
  const [apiKey, setApiKey] = useState('');
  const [theme, setTheme] = useState('default');
  const [position, setPosition] = useState('bottom-right');
  const [title, setTitle] = useState('Chat with us');
  const [greeting, setGreeting] = useState(`Hi! I'm ${appName}. How can I help you today?`);
  const [placeholder, setPlaceholder] = useState('Type a message...');
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-agentbase.com';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const embedCode = useMemo(() => {
    const attrs = [
      `src="${baseUrl}/widget.js"`,
      `data-app-id="${applicationId}"`,
      `data-api-key="${apiKey || 'YOUR_API_KEY'}"`,
      `data-api-url="${apiUrl}"`,
    ];
    if (theme !== 'default') attrs.push(`data-theme="${theme}"`);
    if (position !== 'bottom-right') attrs.push(`data-position="${position}"`);
    if (title !== 'Chat with us') attrs.push(`data-title="${title}"`);
    if (greeting) attrs.push(`data-greeting="${greeting}"`);
    if (placeholder !== 'Type a message...') attrs.push(`data-placeholder="${placeholder}"`);

    return `<script\n  ${attrs.join('\n  ')}\n></script>`;
  }, [applicationId, apiKey, theme, position, title, greeting, placeholder, baseUrl, apiUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedTheme = THEMES.find(t => t.value === theme);

  return (
    <div className="space-y-6">
      {/* Config Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Options */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ab_xxxx... (create one in Settings → API Keys)"
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">
              Required for the widget to work. Create one in Settings → API Keys.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
            <div className="flex gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all ${
                    theme === t.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white"
            >
              {POSITIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Widget Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Greeting Message</label>
            <input
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Input Placeholder</label>
            <input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Preview</label>
          <div className="bg-slate-100 rounded-xl p-4 flex items-end justify-end" style={{ minHeight: '420px' }}>
            <div
              className="rounded-xl shadow-lg overflow-hidden flex flex-col"
              style={{
                width: '320px',
                height: '380px',
                background: theme === 'dark' ? '#0F172A' : '#fff',
                border: `1px solid ${theme === 'dark' ? '#334155' : '#E2E8F0'}`,
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: selectedTheme?.color }}
              >
                <span className="text-white font-semibold text-sm">{title}</span>
                <span className="text-white/70 text-xs cursor-pointer">✕</span>
              </div>

              {/* Messages */}
              <div
                className="flex-1 p-3 flex flex-col gap-2 overflow-hidden"
                style={{ background: theme === 'dark' ? '#1E293B' : '#F8FAFC' }}
              >
                {greeting && (
                  <div
                    className="text-xs px-3 py-2 rounded-xl max-w-[80%]"
                    style={{
                      background: theme === 'dark' ? '#334155' : '#F1F5F9',
                      color: theme === 'dark' ? '#F1F5F9' : '#1E293B',
                    }}
                  >
                    {greeting}
                  </div>
                )}
                <div
                  className="text-xs px-3 py-2 rounded-xl max-w-[80%] self-end"
                  style={{ background: selectedTheme?.color, color: '#fff' }}
                >
                  Hello! Can you help me?
                </div>
                <div
                  className="text-xs px-3 py-2 rounded-xl max-w-[80%]"
                  style={{
                    background: theme === 'dark' ? '#334155' : '#F1F5F9',
                    color: theme === 'dark' ? '#F1F5F9' : '#1E293B',
                  }}
                >
                  Of course! What would you like to know?
                </div>
              </div>

              {/* Input */}
              <div
                className="px-3 py-2 flex gap-2"
                style={{
                  borderTop: `1px solid ${theme === 'dark' ? '#334155' : '#E2E8F0'}`,
                  background: theme === 'dark' ? '#0F172A' : '#fff',
                }}
              >
                <div
                  className="flex-1 px-2 py-1.5 rounded text-[11px]"
                  style={{
                    border: `1px solid ${theme === 'dark' ? '#334155' : '#E2E8F0'}`,
                    color: theme === 'dark' ? '#64748B' : '#94A3B8',
                    background: theme === 'dark' ? '#1E293B' : '#fff',
                  }}
                >
                  {placeholder}
                </div>
                <div
                  className="px-3 py-1.5 rounded text-[11px] text-white font-medium"
                  style={{ background: selectedTheme?.color }}
                >
                  Send
                </div>
              </div>
              <div className="text-center py-1" style={{ color: '#94A3B8', fontSize: '9px' }}>
                Powered by Agentbase
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embed Code Output */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Embed Code</label>
          <button
            onClick={handleCopy}
            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 font-medium"
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>
        <pre className="bg-slate-900 text-green-400 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre font-mono">
          {embedCode}
        </pre>
        <p className="text-xs text-slate-500 mt-2">
          Paste this code just before the closing <code className="bg-slate-100 px-1 rounded">&lt;/body&gt;</code> tag
          on any page where you want the chat widget to appear.
        </p>
      </div>

      {/* REST API Example */}
      <div className="bg-white border rounded-xl p-5">
        <h4 className="font-semibold text-slate-900 mb-3">REST API Integration</h4>
        <p className="text-sm text-slate-500 mb-3">
          You can also integrate directly via the Public API using your API key:
        </p>
        <pre className="bg-slate-900 text-green-400 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre font-mono">
{`curl -X POST ${apiUrl}/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "message": "Hello, how can you help me?",
    "sessionId": "user-123"
  }'`}
        </pre>
      </div>
    </div>
  );
}
