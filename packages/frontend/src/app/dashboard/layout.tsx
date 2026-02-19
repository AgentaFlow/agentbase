"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import NotificationBell from "@/components/notifications/notification-bell";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/dashboard/applications", label: "Applications", icon: "🚀" },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: "📚" },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: "🛒" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
  { href: "/dashboard/team", label: "Team", icon: "👥" },
  { href: "/dashboard/billing", label: "Billing", icon: "💳" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "🔗" },
  { href: "/dashboard/plugins", label: "My Plugins", icon: "🧩" },
  { href: "/dashboard/themes", label: "Themes", icon: "🎨" },
  { href: "/dashboard/branding", label: "Branding", icon: "🖌️" },
  { href: "/dashboard/custom-domains", label: "Domains", icon: "🌐" },
  { href: "/dashboard/exports", label: "Export/Import", icon: "📦" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

const adminNavItems = [
  { href: "/dashboard/admin", label: "Admin Panel", icon: "🛡️" },
  { href: "/dashboard/audit", label: "Audit Log", icon: "📋" },
  { href: "/dashboard/system-health", label: "System Health", icon: "💚" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-6 border-b">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AB</span>
          </div>
          <span className="text-lg font-bold text-slate-900">Agentbase</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        {user?.role === "admin" && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Admin
              </span>
            </div>
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <div className="p-4 border-t">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user.displayName || user.email}
            </p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — fixed on mobile, static on desktop */}
        <aside
          className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          {sidebarContent}
        </aside>

        <main className="flex-1 overflow-auto min-w-0">
          {/* Top bar */}
          <div className="h-14 border-b bg-white flex items-center justify-between px-4 sm:px-6 gap-3 sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              aria-label="Open sidebar"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex items-center gap-3 ml-auto">
              <NotificationBell />
              {user && (
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700">
                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
