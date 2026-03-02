import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal – Agentbase",
  description:
    "Legal policies governing the use of the Agentbase platform, marketplace, and services.",
};

const policies = [
  {
    href: "/legal/terms",
    title: "Terms of Use",
    description:
      "The agreement between you and Agentbase governing your access to and use of the platform, including account creation, subscriptions, and service availability.",
  },
  {
    href: "/legal/privacy",
    title: "Privacy Policy",
    description:
      "How we collect, use, store, and protect your personal information, including data shared with AI providers and third-party services.",
  },
  {
    href: "/legal/fair-use",
    title: "Fair Use Policy",
    description:
      "Guidelines for responsible use of platform resources, including AI model usage limits, rate limiting, and marketplace developer conduct.",
  },
  {
    href: "/legal/licensing",
    title: "Licensing",
    description:
      "Open-source licensing under GPL-3.0 for the Agentbase platform, plus rules for plugin and theme licensing in the marketplace.",
  },
  {
    href: "/legal/data-protection",
    title: "Data Protection",
    description:
      "Our commitments to data protection and privacy regulations including GDPR, data processing agreements, and cross-border data transfers.",
  },
  {
    href: "/legal/cookies",
    title: "Cookie Policy",
    description:
      "Information about the cookies and similar technologies we use, their purposes, and how to manage your preferences.",
  },
  {
    href: "/legal/acceptable-use",
    title: "Acceptable Use Policy",
    description:
      "Rules governing what content and activities are permitted on the Agentbase platform, with specific guidance for AI-generated content and marketplace submissions.",
  },
];

export default function LegalOverview() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Legal Policies</h1>
      <p className="text-slate-500 mb-8">
        Last updated: March 1, 2026. These policies govern your use of the
        Agentbase platform and services operated by AgentaFlow.
      </p>

      <div className="grid gap-4">
        {policies.map((policy) => (
          <Link
            key={policy.href}
            href={policy.href}
            className="block bg-white border rounded-xl p-6 hover:border-brand-300 hover:shadow-sm transition-all group"
          >
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-600 mb-1">
              {policy.title}
            </h2>
            <p className="text-sm text-slate-500">{policy.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 p-6 bg-white border rounded-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Questions?
        </h2>
        <p className="text-sm text-slate-500">
          If you have any questions about our legal policies, please contact us
          at{" "}
          <a
            href="mailto:legal@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            legal@agentaflow.com
          </a>{" "}
          or visit our{" "}
          <a
            href="https://github.com/agentaflow/agentbase/issues"
            className="text-brand-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Issues
          </a>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
