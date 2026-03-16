import Link from "next/link";

const PLANS = [
  {
    tier: "free",
    name: "Free",
    price: 0,
    description: "Everything you need to get started and try Agentbase.",
    highlight: false,
    badge: null,
    features: [
      "3 Applications",
      "10K tokens / month",
      "1K messages / month",
      "2 API Keys",
      "Community support",
      "Plugin marketplace access",
    ],
    cta: "Get Started Free",
    ctaHref: "/register",
    ctaStyle: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  },
  {
    tier: "starter",
    name: "Starter",
    price: 29,
    description: "For indie developers and early-stage products.",
    highlight: false,
    badge: null,
    features: [
      "10 Applications",
      "100K tokens / month",
      "10K messages / month",
      "5 API Keys",
      "Email support",
      "Custom themes",
      "Plugin marketplace access",
    ],
    cta: "Start with Starter",
    ctaHref: "/register?plan=starter",
    ctaStyle: "border border-brand-600 text-brand-600 hover:bg-brand-50",
  },
  {
    tier: "pro",
    name: "Pro",
    price: 99,
    description: "For growing teams shipping production AI products.",
    highlight: true,
    badge: "Most Popular",
    features: [
      "50 Applications",
      "1M tokens / month",
      "100K messages / month",
      "25 API Keys",
      "Priority support",
      "Custom themes",
      "Webhooks",
      "White-label branding",
    ],
    cta: "Start Pro",
    ctaHref: "/register?plan=pro",
    ctaStyle: "bg-brand-600 text-white hover:bg-brand-700",
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: 499,
    description: "For organisations that need scale, security, and SLAs.",
    highlight: false,
    badge: null,
    features: [
      "Unlimited Applications",
      "10M tokens / month",
      "1M messages / month",
      "100 API Keys",
      "Dedicated support",
      "SLA guarantee",
      "SSO (SAML / LDAP)",
      "On-premise option",
    ],
    cta: "Start Enterprise",
    ctaHref: "/register?plan=enterprise",
    ctaStyle: "bg-amber-500 text-white hover:bg-amber-600",
  },
];

const FAQS = [
  {
    q: "Can I change my plan later?",
    a: "Yes — upgrade or downgrade at any time from your billing dashboard. Upgrades take effect immediately; downgrades apply at the end of your billing period.",
  },
  {
    q: "What happens if I exceed my token or message limits?",
    a: "We'll notify you when you reach 80 % of your limit. Once exceeded, AI features are paused until you upgrade or the next billing cycle begins.",
  },
  {
    q: "Is Agentbase open source? Can I self-host?",
    a: "Yes. The core platform is released under GNU GPL v3 and can be self-hosted entirely for free. The hosted plans on agentaflow.com give you a managed environment so you don't have to worry about infrastructure.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Annual plans are on our roadmap and will offer a ~20 % discount. Contact us if you need an annual arrangement for your team today.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards via Stripe. Enterprise customers can also pay by invoice.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "The Free plan is permanent — no trial period or credit card required. Paid plans can be cancelled at any time with no lock-in.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AB</span>
          </div>
          <span className="text-xl font-bold text-slate-900">Agentbase</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/features"
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-brand-600 font-medium border-b-2 border-brand-600 pb-0.5"
          >
            Pricing
          </Link>
          <a
            href="https://agentaflow.github.io/agentbase"
            className="text-slate-600 hover:text-slate-900 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <Link
            href="/login"
            className="border border-brand-600 text-brand-600 px-4 py-2 rounded-lg hover:bg-brand-50 font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-slate-600">
              Start free. Scale as you grow. No lock-in, no hidden fees.
            </p>
          </div>
        </section>

        {/* ── Plans ────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-2xl border-2 bg-white p-7 shadow-sm transition-shadow hover:shadow-md ${
                  plan.highlight
                    ? "border-brand-500 ring-4 ring-brand-50"
                    : "border-slate-200"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <h2 className="text-lg font-bold text-slate-900">
                  {plan.name}
                </h2>
                <p className="text-sm text-slate-500 mt-1 mb-5 leading-relaxed">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-extrabold text-slate-900">
                      Free
                    </span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">
                        ${plan.price}
                      </span>
                      <span className="text-slate-500 text-sm mb-1">
                        /month
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors mb-7 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>

                {/* Divider */}
                <hr className="border-slate-100 mb-5" />

                {/* Features */}
                <ul className="flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-slate-600"
                    >
                      <svg
                        className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature Comparison Table ─────────────────────────────────────── */}
        <section className="bg-white border-t border-b">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
              Compare plans
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-6 font-semibold text-slate-500 w-1/3">
                      Feature
                    </th>
                    {PLANS.map((p) => (
                      <th
                        key={p.tier}
                        className={`text-center py-3 px-4 font-bold ${
                          p.highlight ? "text-brand-600" : "text-slate-900"
                        }`}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      label: "Monthly price",
                      values: ["Free", "$29", "$99", "$499"],
                    },
                    {
                      label: "Applications",
                      values: ["3", "10", "50", "Unlimited"],
                    },
                    {
                      label: "Tokens / month",
                      values: ["10K", "100K", "1M", "10M"],
                    },
                    {
                      label: "Messages / month",
                      values: ["1K", "10K", "100K", "1M"],
                    },
                    { label: "API Keys", values: ["2", "5", "25", "100"] },
                    {
                      label: "Custom themes",
                      values: [false, true, true, true],
                    },
                    { label: "Webhooks", values: [false, false, true, true] },
                    {
                      label: "White-label branding",
                      values: [false, false, true, true],
                    },
                    {
                      label: "SSO (SAML / LDAP)",
                      values: [false, false, false, true],
                    },
                    {
                      label: "SLA guarantee",
                      values: [false, false, false, true],
                    },
                    {
                      label: "On-premise option",
                      values: [false, false, false, true],
                    },
                    {
                      label: "Support",
                      values: ["Community", "Email", "Priority", "Dedicated"],
                    },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-6 text-slate-600 font-medium">
                        {row.label}
                      </td>
                      {row.values.map((v, i) => (
                        <td key={i} className="text-center py-3 px-4">
                          {typeof v === "boolean" ? (
                            v ? (
                              <svg
                                className="w-4 h-4 text-green-500 mx-auto"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <span className="text-slate-300 text-base">
                                —
                              </span>
                            )
                          ) : (
                            <span
                              className={
                                PLANS[i].highlight
                                  ? "font-semibold text-brand-700"
                                  : "text-slate-700"
                              }
                            >
                              {v}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Self-host callout ─────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-slate-900 text-white rounded-2xl p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🐳</span>
                <h3 className="text-xl font-bold">Prefer to self-host?</h3>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Agentbase is open source under GNU GPL v3. Run it on your own
                servers with Docker — no usage limits, no monthly fees, full
                control over your data.
              </p>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              <a
                href="https://github.com/agentaflow/agentbase"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-100 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                View on GitHub
              </a>
              <a
                href="https://agentaflow.github.io/agentbase/self-hosting"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-slate-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
              >
                Self-hosting docs
              </a>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="bg-white border-t">
          <div className="max-w-3xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
              Frequently asked questions
            </h2>
            <dl className="space-y-6">
              {FAQS.map((item) => (
                <div key={item.q} className="border rounded-xl p-6">
                  <dt className="font-semibold text-slate-900 mb-2">
                    {item.q}
                  </dt>
                  <dd className="text-slate-600 text-sm leading-relaxed">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="bg-brand-600">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to start building?
            </h2>
            <p className="text-brand-100 text-lg mb-8">
              The Free plan never expires. No credit card required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-brand-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-brand-50 transition-colors"
              >
                Start Building Free
              </Link>
              <Link
                href="/login"
                className="border border-brand-300 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-brand-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t bg-white px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            Agentbase is open source under GPL-3.0 · Built by{" "}
            <a
              href="https://www.agentaflow.com/"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              AgentaFlow
            </a>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/features" className="hover:text-slate-900">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/legal/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/legal" className="hover:text-slate-900">
              Legal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
