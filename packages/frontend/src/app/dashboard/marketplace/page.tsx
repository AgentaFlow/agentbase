"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface AvailableUpdate {
  installedPluginId: string;
  pluginId: string;
  marketplacePluginId: string;
  latestVersion: string;
  currentVersion: string;
  changelog: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("popular");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [updates, setUpdates] = useState<AvailableUpdate[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.browseMarketplace({
        search: search || undefined,
        sort,
        page,
      });
      setPlugins(result.plugins || []);
      setTotal(result.total || 0);
    } catch {
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }, [search, sort, page]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [feat, cats, upds] = await Promise.all([
          api.getFeaturedPlugins().catch(() => []),
          api.getMarketplaceCategories().catch(() => []),
          api.getAvailableUpdates().catch(() => []),
        ]);
        setFeatured(feat || []);
        setCategories(cats || []);
        setUpdates((upds as AvailableUpdate[]) || []);
      } catch {}
    };
    loadInitial();
    loadPlugins();
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [sort, page, loadPlugins]);

  const handleUpdate = async (update: AvailableUpdate) => {
    setUpdatingId(update.installedPluginId);
    try {
      await api.markPluginUpdated(
        update.installedPluginId,
        update.latestVersion,
      );
      setUpdates((prev) =>
        prev.filter((u) => u.installedPluginId !== update.installedPluginId),
      );
    } catch {
      // let user retry
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    // Default to relevance sort when a search query is active
    if (search && sort === "popular") setSort("relevance");
    loadPlugins();
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${star <= rating ? "text-amber-400" : "text-slate-200"}`}
        >
          â˜…
        </span>
      ))}
    </div>
  );

  const formatPrice = (p: any) =>
    p.isFree || !p.price
      ? "Free"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(p.price / 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">
            Discover plugins to extend your AI applications
          </p>
        </div>
      </div>

      {/* Available Updates Banner */}
      {updates.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-amber-800">
              🔔 {updates.length} plugin update{updates.length > 1 ? "s" : ""}{" "}
              available
            </span>
          </div>
          <div className="space-y-2">
            {updates.map((u) => (
              <div
                key={u.installedPluginId}
                className="flex items-center justify-between gap-3 rounded-lg bg-white border border-amber-100 px-4 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate block">
                    {u.pluginId}
                  </span>
                  <span className="text-xs text-slate-500">
                    {u.currentVersion} → {u.latestVersion}
                    {u.changelog && ` · ${u.changelog}`}
                  </span>
                </div>
                <button
                  disabled={updatingId === u.installedPluginId}
                  onClick={() => handleUpdate(u)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
                >
                  {updatingId === u.installedPluginId ? "Updating…" : "Update"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setSearch(cat.name);
                setPage(1);
                loadPlugins();
              }}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-white border rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="flex-1 px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            Search
          </button>
        </form>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 border rounded-lg text-sm outline-none bg-white"
        >
          {search && <option value="relevance">Most Relevant</option>}
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
          <option value="price">Price: Low to High</option>
        </select>
      </div>

      {/* Featured */}
      {!search && featured.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-slate-900 mb-3">Featured</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.slice(0, 3).map((p: any) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/marketplace/${p.id}`)}
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-lg">
                    ðŸ§©
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm">
                      {p.name}
                    </h3>
                    <span className="text-xs text-slate-400">v{p.version}</span>
                  </div>
                  <span className="ml-auto text-xs font-semibold text-brand-700">
                    {formatPrice(p)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {p.description || "No description"}
                </p>
                <div className="flex items-center gap-2">
                  {renderStars(Math.round(p.avgRating || 0))}
                  <span className="text-xs text-slate-400">
                    ({p.totalReviews || 0})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plugin Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">
            {search ? `Results for "${search}"` : "All Plugins"}
            <span className="text-sm font-normal text-slate-400 ml-2">
              ({total})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border p-5 h-40 animate-pulse"
              />
            ))}
          </div>
        ) : plugins.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-5xl block mb-3">ðŸ”</span>
            <p className="text-sm">
              {search
                ? "No plugins match your search"
                : "No plugins available yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plugins.map((p: any) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/marketplace/${p.id}`)}
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg">
                    ðŸ§©
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 text-sm truncate">
                      {p.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {p.author || "Unknown"} Â· v{p.version}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-brand-700">
                    {formatPrice(p)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {p.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {renderStars(Math.round(p.avgRating || 0))}
                    <span className="text-xs text-slate-400 ml-1">
                      ({p.totalReviews || 0})
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${p.isFree ? "bg-green-50 text-green-700" : "bg-brand-50 text-brand-700"}`}
                  >
                    {p.isFree ? "Free" : "Paid"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 18 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-slate-500">
              Page {page}
            </span>
            <button
              disabled={plugins.length < 18}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
