"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ModelConfig {
  _id: string;
  applicationId: string;
  provider: string;
  modelId: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
  settings: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    systemPrompt?: string;
  };
}

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
  },
  {
    id: "google",
    name: "Google Gemini",
    models: ["gemini-pro", "gemini-pro-vision"],
  },
  {
    id: "huggingface",
    name: "HuggingFace",
    models: [
      "meta-llama/Llama-2-70b-chat-hf",
      "mistralai/Mistral-7B-Instruct-v0.1",
    ],
  },
];

export default function ModelsPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    provider: "openai",
    modelId: "gpt-4",
    displayName: "",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
    systemPrompt: "",
    isDefault: false,
  });

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    if (selectedApp) loadConfigs();
  }, [selectedApp]);

  const loadApplications = async () => {
    try {
      const apps = await api.getApplications();
      setApplications(apps || []);
      if (apps?.length > 0) {
        setSelectedApp(apps[0].id);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const data = await api.getModelConfigs(selectedApp);
      setConfigs(data || []);
    } catch (err) {
      console.error("Failed to load model configs:", err);
      setConfigs([]);
    }
  };

  const handleSave = async () => {
    try {
      await api.createModelConfig({
        applicationId: selectedApp,
        provider: formData.provider,
        modelId: formData.modelId,
        name:
          formData.displayName || `${formData.provider}/${formData.modelId}`,
        isDefault: formData.isDefault,
        settings: {
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          topP: formData.topP,
          systemPrompt: formData.systemPrompt,
        },
      });
      setShowForm(false);
      loadConfigs();
    } catch (err) {
      console.error("Failed to save model config:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this model configuration?")) return;
    try {
      await api.deleteModelConfig(id);
      loadConfigs();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggleDefault = async (id: string) => {
    try {
      await api.setDefaultModelConfig(id);
      loadConfigs();
    } catch (err) {
      console.error("Failed to set default:", err);
    }
  };

  const selectedProvider = PROVIDERS.find((p) => p.id === formData.provider);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Models</h1>
          <p className="text-slate-500 mt-1">
            Configure AI model providers for your applications.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
        >
          {showForm ? "Cancel" : "+ Add Model"}
        </button>
      </div>

      {/* Application Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Application
        </label>
        <select
          value={selectedApp}
          onChange={(e) => setSelectedApp(e.target.value)}
          className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm"
        >
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add Model Form */}
      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            New Model Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  const provider = e.target.value;
                  const models =
                    PROVIDERS.find((p) => p.id === provider)?.models || [];
                  setFormData({
                    ...formData,
                    provider,
                    modelId: models[0] || "",
                  });
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Model
              </label>
              <select
                value={formData.modelId}
                onChange={(e) =>
                  setFormData({ ...formData, modelId: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {selectedProvider?.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder={`${formData.provider}/${formData.modelId}`}
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Temperature ({formData.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={formData.maxTokens}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxTokens: parseInt(e.target.value),
                  })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Top P ({formData.topP})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.topP}
                onChange={(e) =>
                  setFormData({ ...formData, topP: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                System Prompt
              </label>
              <textarea
                rows={3}
                value={formData.systemPrompt}
                onChange={(e) =>
                  setFormData({ ...formData, systemPrompt: e.target.value })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="You are a helpful assistant..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
              />
              <label htmlFor="isDefault" className="text-sm text-slate-700">
                Set as default model
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Model Configs List */}
      {configs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="font-semibold text-slate-900 mb-1">
            No AI models configured
          </h3>
          <p className="text-sm text-slate-500">
            Add your first AI model configuration to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <div
              key={config._id}
              className="bg-white rounded-xl border p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                  {config.provider === "openai" && "🟢"}
                  {config.provider === "anthropic" && "🟠"}
                  {config.provider === "google" && "🔵"}
                  {config.provider === "huggingface" && "🟡"}
                  {!["openai", "anthropic", "google", "huggingface"].includes(
                    config.provider,
                  ) && "⚙️"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {config.displayName ||
                        `${config.provider}/${config.modelId}`}
                    </h3>
                    {config.isDefault && (
                      <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Default
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${config.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {config.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {config.provider} &middot; {config.modelId}
                    {config.settings?.temperature !== undefined &&
                      ` &middot; temp: ${config.settings.temperature}`}
                    {config.settings?.maxTokens &&
                      ` &middot; max tokens: ${config.settings.maxTokens}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!config.isDefault && (
                  <button
                    onClick={() => handleToggleDefault(config._id)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(config._id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provider Info */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Supported Providers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-slate-900 mb-1">{p.name}</h3>
              <div className="space-y-1">
                {p.models.map((m) => (
                  <p key={m} className="text-xs text-slate-500">
                    {m}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
