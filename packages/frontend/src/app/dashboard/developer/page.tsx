"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function DeveloperPortalPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    api
      .getDeveloperProfile()
      .then((p) => setProfile(p))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleStripeOnboard = async () => {
    setOnboarding(true);
    try {
      const { onboardingUrl } = await api.connectStripeOnboarding();
      window.location.href = onboardingUrl;
    } catch (err: any) {
      alert(err.message);
      setOnboarding(false);
    }
  };

  const QUICK_LINKS = [
    {
      href: "/dashboard/developer/earnings",
      icon: "💰",
      label: "Earnings & Payouts",
      description:
        "View revenue, monthly breakdowns, and Stripe payout history.",
    },
    {
      href: "/dashboard/developer/submit",
      icon: "📤",
      label: "Submit Plugin / Theme",
      description:
        "Upload a ZIP package for review. Approved items go live immediately.",
    },
    {
      href: "/dashboard/marketplace",
      icon: "🧩",
      label: "Browse Marketplace",
      description: "See your published plugins in the catalog.",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Developer Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Build and monetize plugins and themes for the Agentbase ecosystem.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Stripe Connect status */}
          <div className="bg-white border rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-1">
              Payout Account
            </h2>
            {profile?.stripeAccountStatus === "active" ? (
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-lg">✓</span>
                <div>
                  <p className="text-sm text-slate-700 font-medium">
                    Stripe Connect linked
                  </p>
                  <p className="text-xs text-slate-500">
                    Payouts are processed monthly to your bank account.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Connect a Stripe Express account to receive payouts from
                  plugin and theme sales. Agentbase pays out{" "}
                  <strong>80% of every sale</strong> — monthly, with no minimum.
                </p>
                <button
                  onClick={handleStripeOnboard}
                  disabled={onboarding}
                  className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {onboarding ? "Redirecting…" : "Connect with Stripe"}
                </button>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow group"
              >
                <div className="text-2xl mb-3">{link.icon}</div>
                <h3 className="font-medium text-slate-900 text-sm mb-1 group-hover:text-brand-600 transition-colors">
                  {link.label}
                </h3>
                <p className="text-xs text-slate-500">{link.description}</p>
              </Link>
            ))}
          </div>

          {/* Revenue share callout */}
          <div className="bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200 rounded-xl p-6">
            <h3 className="font-semibold text-brand-900 mb-2">
              80% Revenue Share — always
            </h3>
            <p className="text-sm text-brand-700">
              We believe your work deserves fair compensation. Agentbase takes
              only 20% to cover payment processing, hosting, and platform
              maintenance. The rest goes directly to you, paid out monthly via
              Stripe.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
