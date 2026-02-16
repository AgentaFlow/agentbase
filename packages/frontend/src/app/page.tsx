import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AB</span>
          </div>
          <span className="text-xl font-bold text-slate-900">Agentbase</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-slate-600 hover:text-slate-900 font-medium"
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

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            WordPress for{' '}
            <span className="text-brand-600">AI Applications</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Build, deploy, and manage AI-powered applications without the
            complexity. Plugins, themes, and a marketplace — everything you need
            to launch AI products.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-brand-600 text-white px-8 py-3 rounded-lg hover:bg-brand-700 font-semibold text-lg"
            >
              Start Building Free
            </Link>
            <Link
              href="https://github.com/agentaflow/agentbase"
              className="border border-slate-300 text-slate-700 px-8 py-3 rounded-lg hover:bg-slate-100 font-semibold text-lg"
            >
              View on GitHub
            </Link>
          </div>

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-blue-600 text-xl">🤖</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Multi-Provider AI</h3>
              <p className="text-slate-600">
                OpenAI, Anthropic, HuggingFace — swap providers with a single
                config change. No vendor lock-in.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-green-600 text-xl">🧩</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Plugin Ecosystem</h3>
              <p className="text-slate-600">
                Extend functionality with plugins. Build your own or install
                from the marketplace.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-purple-600 text-xl">🎨</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Themes & Branding</h3>
              <p className="text-slate-600">
                Customize the look and feel of your AI apps with themes. White-label
                for enterprise.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white px-6 py-6 text-center text-slate-500 text-sm">
        <p>Agentbase is open source under GPL-3.0 · Built by AgentaFlow</p>
      </footer>
    </div>
  );
}
