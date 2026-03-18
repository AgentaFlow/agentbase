import Link from "next/link";
import { ScreenshotsGallery } from "@/components/features/screenshots-gallery"; // component path unchanged

// ─── Add your screenshot images to public/features/screenshots/ ──────────────
// Then list them here. Each entry will appear as a card in the Screenshots section.
const SCREENSHOTS: { src: string; alt: string; caption: string }[] = [
  {
    src: "/features/screenshots/ab_dashboard.png",
    alt: "Agentbase dashboard overview",
    caption: "Main dashboard",
  },
  {
    src: "/features/screenshots/ab_chatapp.png",
    alt: "Chat application view",
    caption: "Manage your AI apps",
  },
  {
    src: "/features/screenshots/ab_createapplication.png",
    alt: "Create a new AI application",
    caption: "Create an application in seconds",
  },
  {
    src: "/features/screenshots/ab_customdomains.png",
    alt: "Custom domains configuration",
    caption: "Bring your own custom domain",
  },
  {
    src: "/features/screenshots/ab_webhooks.png",
    alt: "Webhooks configuration panel",
    caption: "Connect other apps via webhooks",
  },
  {
    src: "/features/screenshots/ab_branding.png",
    alt: "Branding and white-label settings",
    caption: "Full white-label branding controls",
  },
];

const FEATURES = [
  {
    icon: "🤖",
    color: "bg-blue-100 text-blue-600",
    title: "Multi-Provider AI",
    description:
      "Connect to OpenAI, Anthropic Claude, Google Gemini, or HuggingFace models. Switch providers with a single config change — no vendor lock-in, ever.",
  },
  {
    icon: "🧩",
    color: "bg-green-100 text-green-600",
    title: "Plugin Ecosystem",
    description:
      "Extend your AI apps with a WordPress-style hook system. Install plugins from the marketplace or build your own using the @agentbase/plugin-sdk.",
  },
  {
    icon: "🎨",
    color: "bg-purple-100 text-purple-600",
    title: "Themes & Branding",
    description:
      "Customize every AI app with themes. Full white-labeling support for enterprise teams — your brand, your colors, your domain.",
  },
  {
    icon: "⚡",
    color: "bg-amber-100 text-amber-600",
    title: "Streaming Responses",
    description:
      "Real-time token streaming via Server-Sent Events. Users see AI responses as they're generated — no waiting for complete responses.",
  },
  {
    icon: "🏪",
    color: "bg-rose-100 text-rose-600",
    title: "Marketplace",
    description:
      "Discover, install, and publish plugins and themes. Developers can monetize their creations through the built-in revenue-sharing marketplace.",
  },
  {
    icon: "🔑",
    color: "bg-cyan-100 text-cyan-600",
    title: "API-First Design",
    description:
      "Every feature is available via a clean REST API. Build custom frontends, integrate with your existing systems, or embed via the widget SDK.",
  },
  {
    icon: "📊",
    color: "bg-indigo-100 text-indigo-600",
    title: "Analytics & Insights",
    description:
      "Track usage, conversation metrics, and costs per application. Understand how your users interact with your AI products.",
  },
  {
    icon: "🔒",
    color: "bg-slate-100 text-slate-600",
    title: "Enterprise Security",
    description:
      "Role-based access control, SSO (SAML/LDAP), audit logs, API key management, and tenant isolation built in from day one.",
  },
  {
    icon: "🌐",
    color: "bg-teal-100 text-teal-600",
    title: "Self-Hosted or Cloud",
    description:
      "Run Agentbase on your own infrastructure with Docker, or use the AgentaFlow hosted platform. You own your data either way.",
  },
];

const STACK = [
  { label: "Backend", value: "NestJS · Node.js · TypeScript" },
  { label: "AI Service", value: "FastAPI · Python" },
  { label: "Frontend", value: "Next.js 14 · Tailwind CSS" },
  { label: "Databases", value: "PostgreSQL · MongoDB · Redis" },
  { label: "AI Providers", value: "OpenAI · Anthropic · Gemini · HuggingFace" },
  { label: "Infrastructure", value: "Docker · Kubernetes · Terraform" },
  { label: "License", value: "GNU GPL v3 (open source)" },
];

export default function AboutPage() {
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
            className="text-brand-600 font-medium border-b-2 border-brand-600 pb-0.5"
          >
            Features
          </Link>
          <Link
            href="/marketplace"
            className="text-slate-600 hover:text-slate-900 font-medium"
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
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span>🌟</span> Open Source · GPL v3
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
              The WordPress model for the AI Era
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Agentbase is an open-source platform that makes building,
              deploying, and managing AI-powered applications as straightforward
              as building a website — without sacrificing power or flexibility.
            </p>
          </div>
        </section>

        {/* ── What is Agentbase ─────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            What is Agentbase?
          </h2>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-5 text-lg leading-relaxed">
            <p>
              Agentbase draws its inspiration directly from WordPress — the
              platform that democratized web publishing by making it accessible
              to everyone. We&apos;re doing the same for AI development. Just as
              WordPress lets you launch a website without being a systems
              engineer, Agentbase lets you build and ship AI applications
              without needing to wrangle infrastructure, model APIs, or complex
              backend architecture.
            </p>
            <p>
              At its core, Agentbase is a hybrid architecture platform. A
              Node.js/NestJS backend handles user management, application
              configuration, the plugin/theme system, and the marketplace. A
              Python/FastAPI AI service manages the deep integrations with large
              language model providers — OpenAI, Anthropic Claude, Google
              Gemini, and HuggingFace — and handles the streaming, prompt
              management, and model serving layers. A Next.js frontend brings
              everything together in a clean, modern dashboard.
            </p>
            <p>
              The platform is designed for two audiences operating in parallel:
              developers who want a self-hosted, fully customizable foundation
              for AI apps; and teams or businesses who want the speed of a
              hosted SaaS product with enterprise features like SSO, audit logs,
              and white-labeling — all with the assurance that they can migrate
              to self-hosted at any time.
            </p>
          </div>
        </section>

        {/* ── Demo video ────────────────────────────────────────────── */}
        <section className="bg-white border-t border-b">
          <div className="max-w-4xl mx-auto px-6 py-16">
            <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
              See it in action
            </p>
            <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border aspect-video">
              <iframe
                src="https://www.youtube.com/embed/MlvWXNynnnI"
                title="Agentbase walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* ── Screenshots ──────────────────────────────────────────────────── */}
        {SCREENSHOTS.length > 0 ? (
          <section className="bg-white border-t border-b">
            <div className="max-w-6xl mx-auto px-6 py-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
                Screenshots
              </h2>
              <p className="text-slate-500 text-center mb-10">
                A look at the Agentbase dashboard · click any image to enlarge
              </p>
              <ScreenshotsGallery shots={SCREENSHOTS} />
            </div>
          </section>
        ) : (
          <section className="bg-white border-t border-b">
            <div className="max-w-6xl mx-auto px-6 py-16 text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Screenshots
              </h2>
              <p className="text-slate-500 mb-8">
                Upload your dashboard images to get started
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {[
                  "Dashboard Overview",
                  "Applications",
                  "Marketplace",
                  "AI Models",
                ].map((label) => (
                  <div
                    key={label}
                    className="aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2"
                  >
                    <span className="text-3xl">🖼️</span>
                    <p className="text-slate-400 text-sm font-medium">
                      {label}
                    </p>
                    <p className="text-slate-300 text-xs">
                      Add to public/features/screenshots/
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
            Everything you need to build AI apps
          </h2>
          <p className="text-slate-500 text-center mb-12">
            A complete platform — not a collection of loosely coupled tools
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 border shadow-sm"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}
                >
                  <span className="text-xl">{f.icon}</span>
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="bg-white border-t border-b">
          <div className="max-w-4xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
              How it works
            </h2>
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 hidden md:block" />
              <div className="space-y-10">
                {[
                  {
                    step: "1",
                    title: "Create an application",
                    body: "Give your AI app a name, choose its AI provider and model, and configure a system prompt. Agentbase provisions everything automatically.",
                  },
                  {
                    step: "2",
                    title: "Install plugins & a theme",
                    body: "Browse the marketplace and install plugins to add capabilities — custom tools, data connectors, workflows. Apply a theme to match your brand.",
                  },
                  {
                    step: "3",
                    title: "Embed or share",
                    body: "Use the built-in embeddable widget to drop your AI app into any website, or share the hosted link directly with your users.",
                  },
                  {
                    step: "4",
                    title: "Monitor & iterate",
                    body: "Track conversations, usage costs, and performance metrics from the analytics dashboard. Swap models or tune prompts without redeploying.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0 relative z-10">
                      {item.step}
                    </div>
                    <div className="pt-1">
                      <h3 className="font-semibold text-lg text-slate-900 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Tech Stack ──────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Built on modern, proven technology
          </h2>
          <div className="bg-white rounded-2xl border divide-y overflow-hidden shadow-sm">
            {STACK.map((row) => (
              <div
                key={row.label}
                className="flex items-center px-6 py-4 gap-4"
              >
                <span className="w-36 text-sm font-semibold text-slate-500 shrink-0">
                  {row.label}
                </span>
                <span className="text-slate-800 text-sm">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Open Source ──────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-bold mb-4">Open Source at the core</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Agentbase is released under the GNU GPL v3 license — the same
              license that powers WordPress. The core platform is free to use,
              modify, and self-host. We believe open source is the right
              foundation for a platform that handles your AI data and
              conversations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://github.com/agentaflow/agentbase"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                View on GitHub
              </a>
              <a
                href="https://agentaflow.github.io/agentbase"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                Read the Docs
              </a>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="bg-brand-600">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to build your first AI app?
            </h2>
            <p className="text-brand-100 text-lg mb-8">
              Create a free account and launch in minutes.
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
            <Link href="/legal" className="hover:text-slate-900">
              Legal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
