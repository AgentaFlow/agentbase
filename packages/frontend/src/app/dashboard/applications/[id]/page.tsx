"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApplication } from "@/lib/hooks";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import StreamingChat from "@/components/chat/streaming-chat";
import PluginManager from "@/components/plugins/plugin-manager";
import PromptTemplates from "@/components/prompts/prompt-templates";
import EmbedCodeGenerator from "@/components/embed/embed-code-generator";

type Tab =
  | "chat"
  | "config"
  | "plugins"
  | "prompts"
  | "conversations"
  | "deploy"
  | "analytics";

export default function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { data: app, loading, error: appError } = useApplication(id);

  const [tab, setTab] = useState<Tab>("chat");
  const [systemPrompt, setSystemPrompt] = useState("");

  // Config state
  const [editConfig, setEditConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Conversations list
  const [conversations, setConversations] = useState<any[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (app?.config) {
      setEditConfig(app.config);
      setSystemPrompt(app.config.systemPrompt || "");
    }
  }, [app]);

  const loadConversations = async () => {
    setConvsLoading(true);
    try {
      const data = await api.getConversationsByApp(id);
      setConversations(data?.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setConvsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "conversations") loadConversations();
    if (tab === "analytics") {
      setAnalyticsLoading(true);
      api
        .getAnalytics(id, 30)
        .then((data: any) => setAnalytics(data))
        .catch(() => setAnalytics(null))
        .finally(() => setAnalyticsLoading(false));
    }
  }, [tab]);

  const saveConfig = async () => {
    if (!editConfig) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await api.updateApplication(id, {
        config: { ...editConfig, systemPrompt },
      });
      setSaveMessage("Configuration saved!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const modelsByProvider: Record<string, { value: string; label: string }[]> = {
    openai: [
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    anthropic: [
      { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    ],
    gemini: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      {
        value: "gemini-2.5-flash-preview-05-20",
        label: "Gemini 2.5 Flash Preview",
      },
      {
        value: "gemini-2.5-pro-preview-05-06",
        label: "Gemini 2.5 Pro Preview",
      },
    ],
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const provider = editConfig?.aiProvider || "openai";
      const model = editConfig?.aiModel || "gpt-4";
      await api.testAiConnection(provider, model);
      setConnectionResult({
        ok: true,
        message: `Connected to ${provider} (${model}) successfully`,
      });
    } catch (err: any) {
      setConnectionResult({
        ok: false,
        message: err?.message || "Connection failed — check your API key",
      });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setConnectionResult(null), 5000);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await api.deleteConversation(convId);
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="animate-pulse text-slate-400 py-12 text-center">
        Loading application...
      </div>
    );
  if (appError)
    return (
      <div className="text-red-500 py-12 text-center">
        Failed to load application
      </div>
    );
  if (!app) return null;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "chat", label: "Chat", icon: "💬" },
    { key: "config", label: "Configuration", icon: "⚙️" },
    { key: "plugins", label: "Plugins", icon: "🧩" },
    { key: "prompts", label: "Prompts", icon: "📝" },
    { key: "deploy", label: "Deploy", icon: "🚀" },
    { key: "analytics", label: "Analytics", icon: "📊" },
    { key: "conversations", label: "History", icon: "📋" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard/applications")}
          className="text-slate-400 hover:text-slate-600 text-lg"
        >
          ←
        </button>
        <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
          <span className="text-brand-600 font-bold">{app.name[0]}</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{app.name}</h1>
          <p className="text-sm text-slate-500">
            {app.config?.aiProvider || "openai"} /{" "}
            {app.config?.aiModel || "gpt-4"}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ml-auto ${app.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}
        >
          {app.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {tab === "chat" && user && (
        <StreamingChat
          applicationId={id}
          userId={user.id}
          config={{
            aiProvider: app.config?.aiProvider,
            aiModel: app.config?.aiModel,
            temperature: app.config?.temperature,
            systemPrompt: app.config?.systemPrompt,
            maxTokens: app.config?.maxTokens,
          }}
        />
      )}

      {/* Config Tab */}
      {tab === "config" && editConfig && (
        <div className="bg-white rounded-xl border p-6 max-w-2xl">
          <h3 className="font-semibold mb-4">AI Configuration</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Provider
                </label>
                <select
                  value={editConfig.aiProvider || "openai"}
                  onChange={(e) => {
                    const provider = e.target.value;
                    const firstModel =
                      modelsByProvider[provider]?.[0]?.value || "";
                    setEditConfig({
                      ...editConfig,
                      aiProvider: provider,
                      aiModel: firstModel,
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg outline-none bg-white text-sm"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Model
                </label>
                <select
                  value={editConfig.aiModel || "gpt-4"}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, aiModel: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg outline-none bg-white text-sm"
                >
                  {(
                    modelsByProvider[editConfig.aiProvider || "openai"] || []
                  ).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Temperature: {editConfig.temperature ?? 0.7}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={editConfig.temperature ?? 0.7}
                onChange={(e) =>
                  setEditConfig({
                    ...editConfig,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={editConfig.maxTokens || 2048}
                onChange={(e) =>
                  setEditConfig({
                    ...editConfig,
                    maxTokens: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
                min={1}
                max={128000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that..."
                className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
                rows={4}
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="border border-brand-600 text-brand-600 px-4 py-2 rounded-lg hover:bg-brand-50 disabled:opacity-50 font-medium text-sm"
              >
                {testingConnection ? "Testing..." : "🔌 Test Connection"}
              </button>
              {saveMessage && (
                <span
                  className={`text-sm ${saveMessage.includes("Failed") ? "text-red-500" : "text-green-600"}`}
                >
                  {saveMessage}
                </span>
              )}
              {connectionResult && (
                <span
                  className={`text-sm ${connectionResult.ok ? "text-green-600" : "text-red-500"}`}
                >
                  {connectionResult.ok ? "✓" : "✗"} {connectionResult.message}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plugins Tab */}
      {tab === "plugins" && <PluginManager applicationId={id} />}

      {/* Prompts Tab */}
      {tab === "prompts" && (
        <PromptTemplates
          applicationId={id}
          onSelectPrompt={(template) => {
            setSystemPrompt(template);
            setEditConfig((prev: any) => ({ ...prev, systemPrompt: template }));
            setTab("config");
          }}
        />
      )}

      {/* Deploy Tab */}
      {tab === "deploy" && (
        <EmbedCodeGenerator
          applicationId={id}
          appName={app.name}
          appSlug={app.slug}
        />
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && (
        <div>
          {analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border p-5 animate-pulse h-24"
                />
              ))}
            </div>
          ) : !analytics ? (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-3">📊</span>
              <p className="text-sm">No analytics data yet</p>
              <p className="text-xs mt-1">
                Start using the chat or widget to generate analytics
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Conversations
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {analytics.conversations?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Messages
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {analytics.messages?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Total Tokens
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {analytics.totalTokens?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Est. Cost
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${((analytics.totalTokens || 0) * 0.00003).toFixed(2)}
                  </p>
                </div>
              </div>
              {analytics.dailyActivity?.length > 0 && (
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Daily Activity (Last 30 Days)
                  </h3>
                  <div
                    className="flex items-end gap-1"
                    style={{ height: "120px" }}
                  >
                    {analytics.dailyActivity.map((day: any) => {
                      const maxCount = Math.max(
                        ...analytics.dailyActivity.map((d: any) => d.count),
                      );
                      const height =
                        maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      return (
                        <div
                          key={day._id}
                          className="flex-1 flex flex-col items-center justify-end"
                          title={`${day._id}: ${day.count}`}
                        >
                          <div
                            className="w-full bg-brand-500 rounded-t-sm min-h-[2px]"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                          <span className="text-[8px] text-slate-400 mt-1 truncate w-full text-center">
                            {day._id.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conversations History Tab */}
      {tab === "conversations" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              Past conversations for this application
            </p>
            <button
              onClick={loadConversations}
              className="text-sm text-brand-600 hover:underline"
            >
              Refresh
            </button>
          </div>
          {convsLoading ? (
            <div className="animate-pulse text-slate-400 py-8 text-center text-sm">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-3">📋</span>
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv: any) => {
                const lastMessage = conv.messages?.[0];
                return (
                  <div
                    key={conv._id}
                    className="bg-white border rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 text-sm truncate">
                        {conv.title || "Untitled conversation"}
                      </h4>
                      {lastMessage && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {lastMessage.content?.slice(0, 80)}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(
                          conv.updatedAt || conv.createdAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteConversation(conv._id)}
                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded ml-3"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
