"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { PurchaseModal } from "@/components/marketplace/purchase-modal";
import { LicenseBadge } from "@/components/marketplace/license-badge";

export default function PluginDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [plugin, setPlugin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [detail, apps] = await Promise.all([
          api.getPluginDetail(id),
          api.getApplications().catch(() => []),
        ]);
        setPlugin(detail);
        setApplications(apps || []);
        if (apps?.length) setSelectedAppId(apps[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleInstall = async () => {
    if (!selectedAppId) return;
    setInstalling(true);
    try {
      await api.installPlugin(selectedAppId, id);
      setInstalled(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInstalling(false);
    }
  };

  const handlePurchaseSuccess = (key: string) => {
    setLicenseKey(key);
    setShowPurchaseModal(false);
  };

  const handleSubmitReview = async () => {
    if (!plugin || !reviewText.trim()) return;
    setSubmitting(true);
    try {
      await api.submitPluginReview(plugin.id, {
        rating: reviewRating,
        review: reviewText,
      });
      setReviewText("");
      setReviewRating(5);
      const updated = await api.getPluginDetail(plugin.id);
      setPlugin(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (
    rating: number,
    interactive = false,
    onChange?: (r: number) => void,
  ) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={`text-sm ${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} ${
            star <= rating ? "text-amber-400" : "text-slate-200"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-64 bg-slate-100 rounded-xl" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="text-center py-16 text-slate-400">
        <span className="text-5xl block mb-3">🔍</span>
        <p className="text-sm">Plugin not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  const isPaid = !plugin.isFree && plugin.price > 0;
  const formattedPrice = isPaid
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(plugin.price / 100)
    : "Free";

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-sm text-brand-600 hover:underline mb-6 flex items-center gap-1"
      >
        ← Back to Marketplace
      </button>

      {showPurchaseModal && (
        <PurchaseModal
          pluginId={plugin.id}
          pluginName={plugin.name}
          price={plugin.price}
          itemType="plugin"
          onSuccess={handlePurchaseSuccess}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}

      {licenseKey && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-green-600 text-xl">✓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">
              Purchase complete!
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Your license key:{" "}
              <code className="font-mono bg-green-100 px-1 rounded">
                {licenseKey}
              </code>
            </p>
            <p className="text-xs text-green-600 mt-1">
              A copy has been sent to your email.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-brand-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                {plugin.iconUrl ? (
                  <img
                    src={plugin.iconUrl}
                    alt={plugin.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  "🧩"
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">
                    {plugin.name}
                  </h1>
                  <LicenseBadge
                    settings={
                      licenseKey
                        ? {
                            isPaid: true,
                            licenseKey,
                            licenseLastValidated: new Date().toISOString(),
                            licenseGracePeriodEnd: new Date(
                              Date.now() + 72 * 3600000,
                            ).toISOString(),
                          }
                        : null
                    }
                  />
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {plugin.description || "No description"}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {renderStars(Math.round(plugin.avgRating || 0))}
                  <span className="text-sm text-slate-400">
                    {plugin.avgRating?.toFixed(1) || "0.0"} (
                    {plugin.totalReviews || 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
              <span>v{plugin.version}</span>
              {plugin.author && <span>by {plugin.author}</span>}
              {plugin.category && (
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {plugin.category}
                </span>
              )}
            </div>

            {plugin.screenshotUrls?.length > 0 && (
              <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
                {plugin.screenshotUrls.map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="h-36 rounded-lg border object-cover shrink-0"
                  />
                ))}
              </div>
            )}

            {plugin.repositoryUrl && (
              <a
                href={plugin.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:underline"
              >
                View Source ↗
              </a>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Reviews</h3>

            <div className="border rounded-lg p-4 mb-4 bg-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-slate-600">Your rating:</span>
                {renderStars(reviewRating, true, setReviewRating)}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
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
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>

            {plugin.reviews?.length > 0 ? (
              <div className="space-y-4">
                {plugin.reviews.map((r: any) => (
                  <div
                    key={r._id}
                    className="border-b last:border-0 pb-3 last:pb-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {r.userName}
                      </span>
                      {renderStars(r.rating)}
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{r.review}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                No reviews yet. Be the first!
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Install / Buy card */}
          <div className="bg-white rounded-xl border p-5">
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formattedPrice}
            </div>
            {isPaid && (
              <p className="text-xs text-slate-500 mb-4">
                One-time purchase · license key included
              </p>
            )}

            {installed ? (
              <div className="w-full py-2.5 text-center text-sm rounded-lg bg-green-50 text-green-700 border border-green-200 mb-3">
                ✓ Installed
              </div>
            ) : isPaid && !licenseKey ? (
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="w-full py-2.5 text-sm rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors mb-3"
              >
                Buy – {formattedPrice}
              </button>
            ) : (
              <div>
                {applications.length > 1 && (
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="w-full mb-3 px-3 py-2 border rounded-lg text-sm outline-none bg-white"
                  >
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleInstall}
                  disabled={installing || !selectedAppId}
                  className="w-full py-2.5 text-sm rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {installing ? "Installing..." : "Install Free"}
                </button>
              </div>
            )}

            {applications.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-2">
                Create an application first to install plugins.
              </p>
            )}
          </div>

          {/* Stats card */}
          <div className="bg-white rounded-xl border p-5">
            <h4 className="font-medium text-slate-900 mb-3">Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Version</span>
                <span className="font-medium text-slate-700">
                  {plugin.version}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Downloads</span>
                <span className="font-medium text-slate-700">
                  {(
                    plugin.downloads ||
                    plugin.downloadCount ||
                    0
                  ).toLocaleString()}
                </span>
              </div>
              {plugin.compatibleCoreVersions?.length > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Requires</span>
                  <span className="font-medium text-slate-700">
                    v{plugin.compatibleCoreVersions[0]}+
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>License</span>
                <span className="font-medium text-slate-700">
                  {plugin.licenseType || "Unknown"}
                </span>
              </div>
            </div>

            {/* Rating distribution */}
            {plugin.ratingDistribution && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="text-xs font-medium text-slate-600 mb-2">
                  Rating Distribution
                </h5>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = plugin.ratingDistribution[star] || 0;
                  const percent =
                    plugin.totalReviews > 0
                      ? (count / plugin.totalReviews) * 100
                      : 0;
                  return (
                    <div
                      key={star}
                      className="flex items-center gap-2 text-xs mb-1"
                    >
                      <span className="w-3 text-slate-500">{star}</span>
                      <span className="text-amber-400">★</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-5 text-right text-slate-400">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
