"use client";

import { useState, useEffect } from "react";
import { useThemes, useApplications } from "@/lib/hooks";
import api from "@/lib/api";

const DEFAULT_COLORS = {
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  accentColor: "#f59e0b",
  backgroundColor: "#ffffff",
  textColor: "#1e293b",
};

export default function ThemesPage() {
  const { data: themes, loading } = useThemes();
  const { data: apps } = useApplications();
  const [previewTheme, setPreviewTheme] = useState<any>(null);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [customizing, setCustomizing] = useState(false);
  const [customColors, setCustomColors] = useState(DEFAULT_COLORS);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (apps?.length && !selectedAppId) setSelectedAppId(apps[0].id);
  }, [apps]);

  useEffect(() => {
    if (previewTheme?.defaultStyles) {
      setCustomColors({ ...DEFAULT_COLORS, ...previewTheme.defaultStyles });
    }
  }, [previewTheme]);

  const handleApply = async () => {
    if (!selectedAppId || !previewTheme) return;
    setApplying(true);
    setMessage("");
    try {
      await api.updateApplicationConfig(selectedAppId, {
        themeId: previewTheme.id,
      });
      setMessage("Theme applied!");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Failed to apply theme");
    } finally {
      setApplying(false);
    }
  };

  const handleSaveCustomization = async () => {
    if (!selectedAppId) return;
    setApplying(true);
    try {
      await api.customizeTheme(selectedAppId, customColors);
      setMessage("Customization saved!");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Failed to save");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Theme Gallery</h1>
        {(apps || []).length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Apply to:</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white"
            >
              {(apps || []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border overflow-hidden animate-pulse"
            >
              <div className="h-28 bg-slate-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (themes || []).length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <span className="text-5xl block mb-4">🎨</span>
          <h3 className="text-lg font-semibold mb-2">No themes available</h3>
          <p className="text-slate-500 text-sm">
            Themes will appear here once published to the gallery.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(themes || []).map((theme: any) => {
            const styles = theme.defaultStyles || {};
            return (
              <div
                key={theme.id}
                className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="h-28 relative"
                  style={{ background: styles.primaryColor || "#6366f1" }}
                >
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {[
                      styles.primaryColor,
                      styles.secondaryColor,
                      styles.accentColor,
                    ]
                      .filter(Boolean)
                      .map((color: string, i: number) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-slate-900">{theme.name}</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                      v{theme.version}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">
                    {theme.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    {theme.isPaid ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        ${theme.price}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600">Free</span>
                    )}
                    <button
                      onClick={() => {
                        setPreviewTheme(theme);
                        setCustomizing(false);
                      }}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview / Customize Modal */}
      {previewTheme && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPreviewTheme(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-24"
              style={{ background: customColors.primaryColor }}
            />
            <div className="p-6">
              <h3 className="text-xl font-bold mb-1">{previewTheme.name}</h3>
              <p className="text-slate-500 text-sm mb-4">
                {previewTheme.description}
              </p>

              {/* Tab toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setCustomizing(false)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium ${!customizing ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setCustomizing(true)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium ${customizing ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  Customize
                </button>
              </div>

              {!customizing ? (
                <>
                  {/* Color Palette */}
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Color Palette
                  </h4>
                  <div className="flex gap-3 mb-4">
                    {Object.entries(customColors).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div
                          className="w-12 h-12 rounded-lg border shadow-sm mb-1"
                          style={{ backgroundColor: value }}
                        />
                        <p className="text-xs text-slate-500">
                          {key.replace("Color", "")}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Live Chat Preview */}
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Live Preview
                  </h4>
                  <div
                    className="border rounded-lg overflow-hidden"
                    style={{ backgroundColor: customColors.backgroundColor }}
                  >
                    <div
                      className="px-4 py-2.5 flex items-center gap-2"
                      style={{ backgroundColor: customColors.primaryColor }}
                    >
                      <div className="w-6 h-6 bg-white/20 rounded-full" />
                      <span className="text-sm font-medium text-white">
                        AI Assistant
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-end">
                        <div
                          className="rounded-xl px-3 py-2 text-sm text-white max-w-[70%]"
                          style={{ backgroundColor: customColors.primaryColor }}
                        >
                          Hello, how can you help me?
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div
                          className="rounded-xl px-3 py-2 text-sm max-w-[70%]"
                          style={{
                            backgroundColor: customColors.secondaryColor + "20",
                            color: customColors.textColor,
                          }}
                        >
                          I&apos;d be happy to help! What do you need?
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <div
                          className="flex-1 h-9 rounded-lg border"
                          style={{
                            borderColor: customColors.primaryColor + "40",
                          }}
                        />
                        <div
                          className="h-9 w-9 rounded-lg"
                          style={{ backgroundColor: customColors.primaryColor }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Customization Panel */}
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Customize Colors
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {Object.entries(customColors).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) =>
                            setCustomColors({
                              ...customColors,
                              [key]: e.target.value,
                            })
                          }
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {key
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (s) => s.toUpperCase())}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveCustomization}
                    disabled={applying || !selectedAppId}
                    className="w-full bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {applying ? "Saving..." : "Save Customization"}
                  </button>
                </>
              )}

              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => setPreviewTheme(null)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                {!customizing && (
                  <button
                    onClick={handleApply}
                    disabled={applying || !selectedAppId}
                    className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {applying ? "Applying..." : "Apply Theme"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
