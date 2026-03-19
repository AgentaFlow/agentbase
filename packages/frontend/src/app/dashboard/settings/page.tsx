"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/api";
import ApiKeyManager from "@/components/embed/api-key-manager";
import { useTour } from "@/components/tour/TourContext";

// Provider metadata for the BYOK UI
const PROVIDERS = [
  { id: "openai", label: "OpenAI", placeholder: "sk-…", hint: "sk-" },
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-…",
    hint: "sk-ant-",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    placeholder: "AIzaSy…",
    hint: "AIzaSy",
  },
  { id: "huggingface", label: "HuggingFace", placeholder: "hf_…", hint: "hf_" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

interface ProviderKeyInfo {
  provider: ProviderId;
  keyHint: string;
  isActive: boolean;
  lastUsedAt: string | null;
  lastValidatedAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { restartTour } = useTour();
  const [activeSection, setActiveSection] = useState<
    "profile" | "security" | "apikeys" | "providers" | "tour"
  >("profile");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Provider Keys (server-backed BYOK)
  const [savedKeys, setSavedKeys] = useState<ProviderKeyInfo[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keyInputs, setKeyInputs] = useState<Record<ProviderId, string>>({
    openai: "",
    anthropic: "",
    gemini: "",
    huggingface: "",
  });
  const [keyStatus, setKeyStatus] = useState<
    Record<
      ProviderId,
      {
        saving?: boolean;
        validating?: boolean;
        removing?: boolean;
        message?: string;
        error?: string;
      }
    >
  >({ openai: {}, anthropic: {}, gemini: {}, huggingface: {} });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setAvatarUrl((user as any).avatarUrl || "");
    }
  }, [user]);

  const loadProviderKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const keys = await api.getProviderKeys();
      setSavedKeys(keys as ProviderKeyInfo[]);
    } catch {
      // Not fatal — user just won't see hints
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === "providers") {
      loadProviderKeys();
    }
  }, [activeSection, loadProviderKeys]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    try {
      await api.updateProfile({
        displayName,
        avatarUrl: avatarUrl || undefined,
      });
      setProfileMessage("Profile updated!");
      setTimeout(() => setProfileMessage(""), 3000);
    } catch (err: any) {
      setProfileMessage(`Error: ${err.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordMessage("");
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const setProviderStatus = (
    provider: ProviderId,
    update: Partial<(typeof keyStatus)[ProviderId]>,
  ) =>
    setKeyStatus((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...update },
    }));

  const handleSaveKey = async (provider: ProviderId) => {
    const raw = keyInputs[provider].trim();
    if (!raw) return;
    setProviderStatus(provider, {
      saving: true,
      message: undefined,
      error: undefined,
    });
    try {
      const result = await api.saveProviderKey(provider, raw);
      setSavedKeys((prev) => {
        const filtered = prev.filter((k) => k.provider !== provider);
        return [...filtered, result as ProviderKeyInfo];
      });
      setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      setProviderStatus(provider, {
        saving: false,
        message: "Key saved & encrypted ✓",
      });
      setTimeout(
        () => setProviderStatus(provider, { message: undefined }),
        4000,
      );
    } catch (err: any) {
      setProviderStatus(provider, {
        saving: false,
        error: err.message || "Failed to save",
      });
    }
  };

  const handleValidateKey = async (provider: ProviderId) => {
    setProviderStatus(provider, {
      validating: true,
      message: undefined,
      error: undefined,
    });
    try {
      const res = await api.validateProviderKey(provider);
      if (res.valid) {
        setProviderStatus(provider, {
          validating: false,
          message: "Key is valid ✓",
        });
        loadProviderKeys(); // Refresh lastValidatedAt
      } else {
        setProviderStatus(provider, {
          validating: false,
          error: res.error || "Key invalid",
        });
      }
      setTimeout(
        () =>
          setProviderStatus(provider, { message: undefined, error: undefined }),
        5000,
      );
    } catch (err: any) {
      setProviderStatus(provider, {
        validating: false,
        error: err.message || "Validation failed",
      });
    }
  };

  const handleRemoveKey = async (provider: ProviderId) => {
    setProviderStatus(provider, {
      removing: true,
      message: undefined,
      error: undefined,
    });
    try {
      await api.deleteProviderKey(provider);
      setSavedKeys((prev) => prev.filter((k) => k.provider !== provider));
      setProviderStatus(provider, { removing: false, message: "Key removed" });
      setTimeout(
        () => setProviderStatus(provider, { message: undefined }),
        3000,
      );
    } catch (err: any) {
      setProviderStatus(provider, {
        removing: false,
        error: err.message || "Failed to remove",
      });
    }
  };

  const sections = [
    { key: "profile" as const, label: "Profile", icon: "👤" },
    { key: "security" as const, label: "Security", icon: "🔒" },
    { key: "apikeys" as const, label: "API Keys", icon: "🔑" },
    { key: "providers" as const, label: "AI Providers", icon: "🤖" },
    { key: "tour" as const, label: "Product Tour", icon: "🗺️" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeSection === s.key ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {/* Profile */}
          {activeSection === "profile" && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-slate-900 mb-4">
                Profile Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Avatar URL
                  </label>
                  <div className="flex gap-3 items-start">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    />
                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm"
                  >
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                  {profileMessage && (
                    <span
                      className={`text-sm ${profileMessage.includes("Error") ? "text-red-500" : "text-green-600"}`}
                    >
                      {profileMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === "security" && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-slate-900 mb-4">
                Change Password
              </h2>
              {passwordError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                  {passwordError}
                </div>
              )}
              {passwordMessage && (
                <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
                  {passwordMessage}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                  />
                </div>
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordSaving || !currentPassword || !newPassword}
                  className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm"
                >
                  {passwordSaving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          )}

          {/* API Keys (server-backed) */}
          {activeSection === "apikeys" && <ApiKeyManager />}

          {/* AI Provider Keys */}
          {activeSection === "providers" && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-slate-900 mb-1">
                AI Provider Keys
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Add your own API keys for OpenAI, Anthropic, Gemini, or
                HuggingFace. Keys are{" "}
                <strong>encrypted at rest on our servers</strong> with AES-256
                and are never stored in your browser. Free-plan users must
                provide their own key; paid plans include platform-managed AI.
              </p>

              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-800">
                <p className="font-medium mb-1">🔐 Bring Your Own Key (BYOK)</p>
                <p>
                  Your key travels over HTTPS and is decrypted only inside the
                  AI service — it is never visible in browser devtools or server
                  logs.{" "}
                  <a
                    href="https://agentaflow.github.io/agentbase/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Learn more →
                  </a>
                </p>
              </div>

              {keysLoading ? (
                <p className="text-sm text-slate-400 py-4">
                  Loading saved keys…
                </p>
              ) : (
                <div className="space-y-5">
                  {PROVIDERS.map((p) => {
                    const saved = savedKeys.find((k) => k.provider === p.id);
                    const st = keyStatus[p.id];
                    return (
                      <div key={p.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">
                            {p.label}
                          </label>
                          {saved && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-mono">
                              ····{saved.keyHint}
                            </span>
                          )}
                        </div>

                        {/* Status messages */}
                        {st.message && (
                          <p className="text-xs text-green-600 mb-2">
                            {st.message}
                          </p>
                        )}
                        {st.error && (
                          <p className="text-xs text-red-500 mb-2">
                            {st.error}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={keyInputs[p.id]}
                            onChange={(e) =>
                              setKeyInputs((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            placeholder={
                              saved
                                ? "Enter new key to replace…"
                                : p.placeholder
                            }
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono"
                          />
                          <button
                            onClick={() => handleSaveKey(p.id)}
                            disabled={!keyInputs[p.id].trim() || st.saving}
                            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-40 text-sm font-medium whitespace-nowrap"
                          >
                            {st.saving ? "Saving…" : saved ? "Replace" : "Save"}
                          </button>
                        </div>

                        {/* Actions for saved key */}
                        {saved && (
                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={() => handleValidateKey(p.id)}
                              disabled={st.validating}
                              className="text-xs text-brand-600 hover:underline disabled:opacity-50"
                            >
                              {st.validating ? "Validating…" : "Validate key"}
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleRemoveKey(p.id)}
                              disabled={st.removing}
                              className="text-xs text-red-500 hover:underline disabled:opacity-50"
                            >
                              {st.removing ? "Removing…" : "Remove"}
                            </button>
                            {saved.lastValidatedAt && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="text-xs text-slate-400">
                                  Last validated{" "}
                                  {new Date(
                                    saved.lastValidatedAt,
                                  ).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Product Tour */}
          {activeSection === "tour" && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-slate-900 mb-1">
                Product Tour
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Take an interactive walkthrough of the key features in
                Agentbase. The tour highlights each section of the dashboard so
                you can get up to speed quickly.
              </p>
              <div className="space-y-3">
                <button
                  onClick={restartTour}
                  className="flex items-center gap-3 bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 font-medium text-sm transition-colors"
                >
                  <span>🗺️</span>
                  Restart Tour
                </button>
                <p className="text-xs text-slate-400">
                  This will reset your tour progress and show the welcome prompt
                  again on next page load.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
