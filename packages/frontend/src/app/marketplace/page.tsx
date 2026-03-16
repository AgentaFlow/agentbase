import Link from "next/link";

const STATS = [
  { value: "500+", label: "Plugins" },
  { value: "200+", label: "Themes" },
  { value: "50K+", label: "Installs" },
  { value: "30%", label: "Revenue share for developers" },
];

const PLUGIN_CATEGORIES = [
  {
    icon: "💬",
    color: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100 text-blue-600",
    name: "Chat & Conversations",
    description:
      "Multi-turn chat, memory management, conversation history, and persona controls for your AI apps.",
    count: "120+ plugins",
  },
  {
    icon: "📄",
    color: "bg-green-50 border-green-200",
    iconBg: "bg-green-100 text-green-600",
    name: "Content Generation",
    description:
      "Blog posts, product descriptions, emails, social copy — AI-powered content creation at scale.",
    count: "85+ plugins",
  },
  {
    icon: "🔍",
    color: "bg-purple-50 border-purple-200",
    iconBg: "bg-purple-100 text-purple-600",
    name: "Search & RAG",
    description:
      "Semantic search, document Q&A, vector store connectors, and retrieval-augmented generation pipelines.",
    count: "60+ plugins",
  },
  {
    icon: "🔗",
    color: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100 text-amber-600",
    name: "Integrations",
    description:
      "Connect Slack, Notion, Jira, Salesforce, Zapier, and hundreds of other tools to your AI apps.",
    count: "95+ plugins",
  },
  {
    icon: "📊",
    color: "bg-rose-50 border-rose-200",
    iconBg: "bg-rose-100 text-rose-600",
    name: "Analytics & Insights",
    description:
      "Track usage, costs, conversation quality, and user engagement across all your AI applications.",
    count: "40+ plugins",
  },
  {
    icon: "🛡️",
    color: "bg-slate-50 border-slate-200",
    iconBg: "bg-slate-100 text-slate-600",
    name: "Safety & Moderation",
    description:
      "Content filters, prompt injection guards, PII detection, and compliance tools for responsible AI.",
    count: "35+ plugins",
  },
];

const THEME_STYLES = [
  {
    icon: "🌙",
    name: "Minimal Dark",
    tag: "Most popular",
    tagColor: "bg-brand-100 text-brand-700",
    description:
      "Clean, dark-first design perfect for developer tools and AI dashboards.",
  },
  {
    icon: "☀️",
    name: "Clean Light",
    tag: "Free",
    tagColor: "bg-green-100 text-green-700",
    description:
      "A bright, accessible theme with generous whitespace, ideal for consumer-facing AI apps.",
  },
  {
    icon: "🏢",
    name: "Enterprise Suite",
    tag: "Premium",
    tagColor: "bg-amber-100 text-amber-700",
    description:
      "Data-dense layouts with sidebar navigation, designed for internal enterprise tools.",
  },
  {
    icon: "🎨",
    name: "Brand Kit",
    tag: "Premium",
    tagColor: "bg-amber-100 text-amber-700",
    description:
      "Fully themeable with your brand colors, fonts, and logo. White-label ready out of the box.",
  },
];

const USER_STEPS = [
  {
    step: "1",
    title: "Browse or search",
    description:
      "Find the right plugin or theme using category filters, ratings, and keyword search.",
  },
  {
    step: "2",
    title: "One-click install",
    description:
      "Install any item directly into your Agentbase application — no manual file uploads or config editing.",
  },
  {
    step: "3",
    title: "Configure & launch",
    description:
      "Every plugin ships with a settings UI. Adjust options and your app is enhanced in seconds.",
  },
];

const DEV_STEPS = [
  {
    step: "1",
    title: "Build with the SDK",
    description:
      "Use @agentbase/plugin-sdk with TypeScript. Full docs, starter templates, and a local dev server included.",
  },
  {
    step: "2",
    title: "Submit for review",
    description:
      "Our automated security scan + lightweight human review typically completes within 48 hours.",
  },
  {
    step: "3",
    title: "Publish & earn",
    description:
      "Set your price, go live, and earn 70% of every sale — paid monthly with no minimum threshold.",
  },
];

const FAQS = [
  {
    q: "Is the marketplace free to browse?",
    a: "Yes. Browsing and searching the marketplace is free for everyone, including users on the Free plan. Many plugins and themes also have a free tier or free version.",
  },
  {
    q: "What's the revenue split for developers?",
    a: "Developers keep 70% of every paid sale. Agentbase retains 30% to cover payment processing, hosting, and platform maintenance. Payouts are processed monthly with no minimum balance required.",
  },
  {
    q: "How long does marketplace review take?",
    a: "Automated security and quality checks run instantly. Human review for new submissions typically takes 24–48 hours. Updates to existing items are usually processed within a few hours.",
  },
  {
    q: "Can I offer a free tier alongside a paid plugin?",
    a: "Absolutely. Freemium is the most popular model in the marketplace. You can define which features are free and which require a license key, with built-in support for tiered pricing.",
  },
  {
    q: "What languages and frameworks can I use to build plugins?",
    a: "Plugins are written in TypeScript/Node.js using the @agentbase/plugin-sdk. AI-heavy processing can be offloaded to any external API or service your plugin calls.",
  },
  {
    q: "Can I install marketplace items on a self-hosted Agentbase instance?",
    a: "Yes. The marketplace is available on all self-hosted installations. Free items are always accessible; paid items require a marketplace account and valid license.",
  },
];

export default function MarketplacePage() {
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
            href="/marketplace"
            className="text-brand-600 font-medium border-b-2 border-brand-600 pb-0.5"
          >
            Marketplace
          </Link>
          <Link
            href="/pricing"
            className="text-slate-600 hover:text-slate-900 font-medium"
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
          <div className="max-w-4xl mx-auto px-6 py-20 text-center">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-brand-200">
              <span>🏪</span> The Agentbase Marketplace
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Extend, customize, and{" "}
              <span className="text-brand-600">earn</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover hundreds of plugins and themes to supercharge your AI
              applications — or build your own and earn income as an Agentbase
              developer.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="bg-brand-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-brand-700 transition-colors"
              >
                Browse the Marketplace
              </Link>
              <a
                href="#for-developers"
                className="border border-slate-300 text-slate-700 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-slate-50 transition-colors"
              >
                Start Earning →
              </a>
            </div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <section className="bg-brand-600">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-4xl font-extrabold text-white mb-1">
                    {s.value}
                  </div>
                  <div className="text-brand-100 text-sm font-medium">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── For Users: Plugin categories ─────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Plugins for every use case
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Browse a growing library of community and official plugins.
              Install in one click — no code required.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {PLUGIN_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className={`border-2 rounded-2xl p-7 ${cat.color} hover:shadow-md transition-shadow`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${cat.iconBg}`}
                >
                  {cat.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {cat.name}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {cat.description}
                </p>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Themes ───────────────────────────────────────────────────────── */}
        <section className="bg-white border-t border-b">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="text-center mb-14">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Beautiful themes, instant identity
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Give every AI application its own look and feel. Switch themes
                without touching a single line of code.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {THEME_STYLES.map((theme) => (
                <div
                  key={theme.name}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-7 hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="text-4xl mb-4">{theme.icon}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-bold text-slate-900">
                      {theme.name}
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${theme.tagColor}`}
                    >
                      {theme.tag}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed flex-1">
                    {theme.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works: For Users ───────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Users */}
            <div>
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-green-200">
                👤 For users
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Extend your apps in minutes
              </h2>
              <p className="text-slate-600 mb-10 leading-relaxed">
                No coding required. Browse the marketplace, install what you
                need, and configure it straight from your dashboard.
              </p>
              <div className="space-y-8">
                {USER_STEPS.map((s) => (
                  <div key={s.step} className="flex gap-5">
                    <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {s.title}
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors text-sm"
                >
                  Start browsing free →
                </Link>
              </div>
            </div>

            {/* Developers */}
            <div id="for-developers">
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-amber-200">
                💻 For developers
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Build once. Earn forever.
              </h2>
              <p className="text-slate-600 mb-10 leading-relaxed">
                The Agentbase SDK makes it straightforward to build and publish
                plugins and themes. Set your own price and keep 70% of every
                sale.
              </p>
              <div className="space-y-8">
                {DEV_STEPS.map((s) => (
                  <div key={s.step} className="flex gap-5">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {s.title}
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <a
                  href="https://agentaflow.github.io/agentbase/plugins/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-amber-600 transition-colors text-sm"
                >
                  Read the developer docs →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Developer revenue callout ─────────────────────────────────────── */}
        <section className="bg-slate-900">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <div className="text-5xl mb-6">💰</div>
            <h2 className="text-4xl font-bold text-white mb-4">
              70% revenue share — always
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              We believe developers should be rewarded fairly for the value they
              create. That's why we offer one of the highest revenue splits in
              the industry with no hidden fees, no tier requirements, and
              monthly payouts from day one.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  icon: "📅",
                  title: "Monthly payouts",
                  body: "Earnings are paid out automatically every month with no minimum balance required.",
                },
                {
                  icon: "💳",
                  title: "Multiple payout methods",
                  body: "Stripe Connect, bank transfer, or PayPal — you choose how and where you get paid.",
                },
                {
                  icon: "📈",
                  title: "Real-time analytics",
                  body: "Track installs, revenue, reviews, and refunds in your developer dashboard.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-slate-800 rounded-xl p-6 text-left"
                >
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h4 className="font-bold text-white mb-2">{item.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <a
              href="https://agentaflow.github.io/agentbase/plugins/publishing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-amber-600 transition-colors"
            >
              Become a marketplace developer →
            </a>
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
              Ready to get started?
            </h2>
            <p className="text-brand-100 text-lg mb-8">
              Users get free marketplace access on every plan. Developers can
              publish their first item at no cost.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-brand-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-brand-50 transition-colors"
              >
                Create a free account
              </Link>
              <a
                href="https://agentaflow.github.io/agentbase/plugins/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-brand-300 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-brand-700 transition-colors"
              >
                Developer docs
              </a>
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
            <Link href="/marketplace" className="hover:text-slate-900">
              Marketplace
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
          </div>
        </div>
      </footer>
    </div>
  );
}
