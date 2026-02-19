"use client";

import { useState } from "react";
import { usePlugins } from "@/lib/hooks";

export default function PluginsPage() {
  const { data: plugins, loading } = usePlugins();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "paid">("all");
  const [detailPlugin, setDetailPlugin] = useState<any>(null);

  const filtered = (plugins || []).filter((p: any) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "free" && !p.isPaid) ||
      (filter === "paid" && p.isPaid);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Plugin Marketplace
      </h1>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-2 border rounded-lg outline-none bg-white text-sm"
        >
          <option value="all">All</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border p-5 animate-pulse"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <span className="text-5xl block mb-4">🧩</span>
          <h3 className="text-lg font-semibold mb-2">No plugins found</h3>
          <p className="text-slate-500 text-sm">
            {search
              ? "Try a different search term."
              : "Plugins will appear here once published to the marketplace."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plugin: any) => (
            <div
              key={plugin.id}
              className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setDetailPlugin(plugin)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <span className="text-brand-600 font-bold">
                    {plugin.name[0]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {plugin.isPaid && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      ${plugin.price}
                    </span>
                  )}
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                    v{plugin.version}
                  </span>
                </div>
              </div>
              <h3 className="font-medium text-slate-900 mb-1">{plugin.name}</h3>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                {plugin.description || "No description"}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {plugin.rating > 0 && (
                    <span>
                      {"★".repeat(Math.round(plugin.rating))} {plugin.rating}
                    </span>
                  )}
                  <span>{plugin.downloadCount || 0} installs</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${plugin.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {plugin.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plugin Detail Modal */}
      {detailPlugin && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setDetailPlugin(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-brand-600 font-bold text-xl">
                    {detailPlugin.name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-900">
                    {detailPlugin.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <span>v{detailPlugin.version}</span>
                    {detailPlugin.author && (
                      <>
                        <span>·</span>
                        <span>by {detailPlugin.author}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Ratings & Stats */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                {detailPlugin.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">
                      {"★".repeat(Math.round(detailPlugin.rating))}
                    </span>
                    <span className="text-slate-600">
                      {detailPlugin.rating.toFixed(1)}
                    </span>
                    {detailPlugin.reviewCount > 0 && (
                      <span className="text-slate-400">
                        ({detailPlugin.reviewCount} reviews)
                      </span>
                    )}
                  </div>
                )}
                <span className="text-slate-400">
                  {detailPlugin.downloadCount || 0} installs
                </span>
                {detailPlugin.isPaid ? (
                  <span className="text-yellow-700 font-medium">
                    ${detailPlugin.price}
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">Free</span>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-1">
                  Description
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {detailPlugin.description || "No description provided."}
                </p>
              </div>

              {/* Category & Tags */}
              {detailPlugin.category && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">
                    Category
                  </h4>
                  <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded">
                    {detailPlugin.category}
                  </span>
                </div>
              )}

              {/* Permissions */}
              {detailPlugin.manifest?.permissions?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">
                    Permissions
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {detailPlugin.manifest.permissions.map((perm: string) => (
                      <span
                        key={perm}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Changelog */}
              {detailPlugin.changelog && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">
                    Changelog
                  </h4>
                  <p className="text-xs text-slate-500 whitespace-pre-wrap">
                    {detailPlugin.changelog}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setDetailPlugin(null)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium">
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
