'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function MarketplacePage() {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<string>('popular');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const result = await api.browseMarketplace({ search: search || undefined, sort, page });
      setPlugins(result.plugins || []);
      setTotal(result.total || 0);
    } catch { setPlugins([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [feat, cats] = await Promise.all([
          api.getFeaturedPlugins().catch(() => []),
          api.getMarketplaceCategories().catch(() => []),
        ]);
        setFeatured(feat || []);
        setCategories(cats || []);
      } catch {}
    };
    loadInitial();
    loadPlugins();
  }, []);

  useEffect(() => { loadPlugins(); }, [sort, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPlugins();
  };

  const openDetail = async (pluginId: string) => {
    setDetailLoading(true);
    try {
      const detail = await api.getPluginDetail(pluginId);
      setSelectedPlugin(detail);
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  const handleSubmitReview = async () => {
    if (!selectedPlugin || !reviewText.trim()) return;
    setSubmitting(true);
    try {
      await api.submitPluginReview(selectedPlugin.id, { rating: reviewRating, review: reviewText });
      setReviewText('');
      setReviewRating(5);
      await openDetail(selectedPlugin.id);
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={`text-sm ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${
            star <= rating ? 'text-amber-400' : 'text-slate-200'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );

  // Plugin Detail Modal
  if (selectedPlugin) {
    return (
      <div>
        <button onClick={() => setSelectedPlugin(null)} className="text-sm text-brand-600 hover:underline mb-4 flex items-center gap-1">
          ← Back to Marketplace
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-brand-100 rounded-xl flex items-center justify-center text-2xl">🧩</div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-slate-900">{selectedPlugin.name}</h1>
                  <p className="text-sm text-slate-500 mt-1">{selectedPlugin.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {renderStars(Math.round(selectedPlugin.avgRating || 0))}
                    <span className="text-sm text-slate-400">
                      {selectedPlugin.avgRating || 0} ({selectedPlugin.totalReviews || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>v{selectedPlugin.version}</span>
                {selectedPlugin.author && <span>by {selectedPlugin.author}</span>}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Reviews</h3>

              {/* Submit review */}
              <div className="border rounded-lg p-4 mb-4 bg-slate-50">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-slate-600">Your rating:</span>
                  {renderStars(reviewRating, true, setReviewRating)}
                </div>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Write a review..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none resize-none bg-white"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmitReview}
                    disabled={!reviewText.trim() || submitting}
                    className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>

              {/* Review list */}
              {selectedPlugin.reviews?.length > 0 ? (
                <div className="space-y-4">
                  {selectedPlugin.reviews.map((r: any) => (
                    <div key={r._id} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700">{r.userName}</span>
                        {renderStars(r.rating)}
                        <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-600">{r.review}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No reviews yet. Be the first!</p>
              )}
            </div>
          </div>

          {/* Sidebar stats */}
          <div>
            <div className="bg-white rounded-xl border p-5 sticky top-4">
              <h4 className="font-medium text-slate-900 mb-3">Rating Distribution</h4>
              {selectedPlugin.ratingDistribution && (
                <div className="space-y-1.5">
                  {[5,4,3,2,1].map(star => {
                    const count = selectedPlugin.ratingDistribution[star] || 0;
                    const percent = selectedPlugin.totalReviews > 0
                      ? (count / selectedPlugin.totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-slate-500">{star}</span>
                        <span className="text-amber-400">★</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="w-6 text-right text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Version</span>
                  <span className="font-medium text-slate-700">{selectedPlugin.version}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Author</span>
                  <span className="font-medium text-slate-700">{selectedPlugin.author || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedPlugin.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {selectedPlugin.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">Discover plugins to extend your AI applications</p>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => { setSearch(cat.name); loadPlugins(); }}
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
            onChange={e => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="flex-1 px-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700">
            Search
          </button>
        </form>
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border rounded-lg text-sm outline-none bg-white"
        >
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
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
                onClick={() => openDetail(p.id)}
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-lg">🧩</div>
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm">{p.name}</h3>
                    <span className="text-xs text-slate-400">v{p.version}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description || 'No description'}</p>
                <div className="flex items-center gap-2">
                  {renderStars(Math.round(p.avgRating || 0))}
                  <span className="text-xs text-slate-400">({p.totalReviews || 0})</span>
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
            {search ? `Results for "${search}"` : 'All Plugins'}
            <span className="text-sm font-normal text-slate-400 ml-2">({total})</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl border p-5 h-40 animate-pulse" />)}
          </div>
        ) : plugins.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="text-sm">{search ? 'No plugins match your search' : 'No plugins available yet'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plugins.map((p: any) => (
              <div
                key={p.id}
                onClick={() => openDetail(p.id)}
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg">🧩</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 text-sm truncate">{p.name}</h3>
                    <span className="text-xs text-slate-400">{p.author || 'Unknown'} · v{p.version}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description || 'No description'}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {renderStars(Math.round(p.avgRating || 0))}
                    <span className="text-xs text-slate-400 ml-1">({p.totalReviews || 0})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
