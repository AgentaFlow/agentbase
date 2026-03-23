"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import api from "@/lib/api";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ─── Inner form rendered inside <Elements> ────────────────────────────────────

function CheckoutForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (licenseKey: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Poll briefly for the license key — webhook delivers it async
      let licenseKey = "";
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const licenses = await api.getMyLicenses();
          if (licenses.length > 0) {
            licenseKey = licenses[licenses.length - 1]?.licenseKey ?? "";
            if (licenseKey) break;
          }
        } catch {
          // ignore poll errors
        }
      }
      onSuccess(licenseKey);
    }

    setPaying(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 mt-5 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={paying || !stripe}
          className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {paying ? "Processing…" : "Pay Now"}
        </button>
      </div>
    </form>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface PurchaseModalProps {
  pluginId: string;
  pluginName: string;
  /** Price in cents */
  price: number;
  itemType: "plugin" | "theme";
  onSuccess: (licenseKey: string) => void;
  onClose: () => void;
}

export function PurchaseModal({
  pluginId,
  pluginName,
  price,
  itemType,
  onSuccess,
  onClose,
}: PurchaseModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [intentError, setIntentError] = useState<string | null>(null);

  useEffect(() => {
    api
      .createPurchaseIntent(pluginId, itemType)
      .then((data) => setClientSecret(data.clientSecret))
      .catch((err) => setIntentError(err.message))
      .finally(() => setLoading(false));
  }, [pluginId, itemType]);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price / 100);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Purchase {pluginName}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          You'll be charged <strong>{formatted}</strong>. A license key will be
          delivered to your email and shown immediately.
        </p>

        {!stripePromise && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Stripe is not configured. Set{" "}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
            </code>
            .
          </div>
        )}

        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        )}

        {intentError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {intentError}
          </div>
        )}

        {clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm onSuccess={onSuccess} onCancel={onClose} />
          </Elements>
        )}
      </div>
    </div>
  );
}
