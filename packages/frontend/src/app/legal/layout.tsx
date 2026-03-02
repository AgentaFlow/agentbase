"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const legalPages = [
  { href: "/legal", label: "Overview" },
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/fair-use", label: "Fair Use Policy" },
  { href: "/legal/licensing", label: "Licensing" },
  { href: "/legal/data-protection", label: "Data Protection" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/acceptable-use", label: "Acceptable Use" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Nav — matches homepage */}
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AB</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Agentbase</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
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

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Mobile sidebar toggle */}
        <div className="md:hidden border-b bg-white px-6 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 text-slate-700 font-medium text-sm"
          >
            <svg
              className={`w-4 h-4 transition-transform ${sidebarOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Legal Policies
          </button>
          {sidebarOpen && (
            <nav className="mt-3 flex flex-col gap-1">
              {legalPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    pathname === page.href
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {page.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-64 shrink-0 border-r bg-white p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Legal Policies
          </h2>
          <nav className="flex flex-col gap-1">
            {legalPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className={`px-3 py-2 rounded-lg text-sm ${
                  pathname === page.href
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {page.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 py-10 md:px-12 lg:px-20 max-w-4xl">
          {children}
        </main>
      </div>

      {/* Footer */}
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
