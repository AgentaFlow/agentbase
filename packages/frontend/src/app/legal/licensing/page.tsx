import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licensing – Agentbase",
  description:
    "Open-source licensing under GPL-3.0 and marketplace licensing rules for the Agentbase platform.",
};

export default function Licensing() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Licensing</h1>
        <p className="text-slate-500 text-sm">
          Effective Date: March 1, 2026 · Last Updated: March 1, 2026
        </p>
      </div>

      <p className="text-slate-700 leading-relaxed">
        Agentbase is committed to open-source software and the principles of
        software freedom. This document describes the licensing terms for the
        Agentbase platform, plugins, themes, and marketplace submissions.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          1. Platform License — GNU GPL v3.0
        </h2>
        <p className="text-slate-700 leading-relaxed">
          The Agentbase platform is released under the{" "}
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.html"
            className="text-brand-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GNU General Public License version 3.0
          </a>{" "}
          (GPL-3.0). This means:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Freedom to Use:</strong> You may use the software for any
            purpose, including commercial use
          </li>
          <li>
            <strong>Freedom to Study:</strong> You may examine the source code
            and understand how it works
          </li>
          <li>
            <strong>Freedom to Modify:</strong> You may modify the source code
            to suit your needs
          </li>
          <li>
            <strong>Freedom to Distribute:</strong> You may redistribute copies
            of the original or modified software, provided you do so under the
            same GPL-3.0 license
          </li>
        </ul>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
          <p className="text-sm text-blue-800">
            <strong>Key Obligation:</strong> If you distribute modified versions
            of Agentbase, you must make your source code available under the
            GPL-3.0 license. This ensures that the platform remains free and
            open for the entire community.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          2. Self-Hosted Deployments
        </h2>
        <p className="text-slate-700 leading-relaxed">
          The GPL-3.0 license permits you to deploy Agentbase on your own
          infrastructure without restriction. You may:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Deploy Agentbase internally within your organization for any number
            of users
          </li>
          <li>
            Modify the platform to meet your organization&apos;s specific
            requirements
          </li>
          <li>
            Integrate Agentbase with proprietary internal systems (see Section 4
            regarding plugins)
          </li>
          <li>
            Offer Agentbase as a managed service to third parties, provided you
            comply with the GPL-3.0 obligations
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Internal use within an organization — without redistribution to
          external parties — does not trigger the GPL-3.0 source code disclosure
          requirement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. Trademark Usage
        </h2>
        <p className="text-slate-700 leading-relaxed">
          The GPL-3.0 license covers the software but does not grant rights to
          use the Agentbase or AgentaFlow trademarks, logos, or branding.
          Specifically:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Modified forks must not use the &quot;Agentbase&quot; name or logo
            without written permission
          </li>
          <li>
            Enterprise white-label customers receive a separate trademark
            license
          </li>
          <li>
            You may describe compatibility with Agentbase (e.g.,
            &quot;Compatible with Agentbase&quot;) without a trademark license
          </li>
          <li>
            Community contributions to the official Agentbase repository are
            exempt from this restriction
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Plugin Licensing
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Agentbase plugins interact with the platform through a defined API
          (the Plugin SDK). The licensing of plugins depends on how they
          interface with the platform:
        </p>

        <h3 className="text-lg font-medium text-slate-800">
          4.1 GPL-3.0 Compatible Plugins
        </h3>
        <p className="text-slate-700 leading-relaxed">
          Plugins that are distributed as derivative works of the Agentbase
          platform (e.g., they modify core platform code or are tightly coupled
          to internal APIs) must be released under the GPL-3.0 or a compatible
          open-source license.
        </p>

        <h3 className="text-lg font-medium text-slate-800">
          4.2 Independently Licensed Plugins
        </h3>
        <p className="text-slate-700 leading-relaxed">
          Plugins that interact solely through the public Plugin SDK API and do
          not incorporate GPL-licensed code may be released under any license,
          including proprietary licenses. This enables developers to create and
          sell commercial plugins through the Marketplace.
        </p>

        <h3 className="text-lg font-medium text-slate-800">
          4.3 Marketplace Requirements
        </h3>
        <p className="text-slate-700 leading-relaxed">
          All plugins submitted to the Agentbase Marketplace must:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Clearly specify their license in the plugin manifest</li>
          <li>Include a LICENSE file in the plugin package</li>
          <li>Comply with the licenses of all dependencies they include</li>
          <li>
            Not violate the intellectual property rights of any third party
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          5. Theme Licensing
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Themes follow the same licensing principles as plugins:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Themes that use only the public Theme API may be licensed under any
            terms
          </li>
          <li>
            Themes that modify or extend core platform template files must
            comply with GPL-3.0
          </li>
          <li>
            Marketplace themes must declare their license and include proper
            attribution for any third-party assets (fonts, icons, images)
          </li>
          <li>
            Theme assets (images, fonts, illustrations) may carry their own
            separate licenses
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          6. Open-Source Attribution
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Agentbase is built on numerous open-source projects. We are grateful
          to the communities behind:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>NestJS (MIT License)</li>
          <li>Next.js (MIT License)</li>
          <li>FastAPI (MIT License)</li>
          <li>PostgreSQL (PostgreSQL License)</li>
          <li>MongoDB (Server Side Public License)</li>
          <li>Redis (BSD License)</li>
          <li>Tailwind CSS (MIT License)</li>
          <li>
            And many more — see the full list in the repository&apos;s NOTICE
            file
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          If you redistribute Agentbase, you must include proper attribution for
          all open-source dependencies as required by their respective licenses.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          7. Contributor License Agreement
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Contributors to the official Agentbase repository agree that their
          contributions are licensed under the GPL-3.0 license. By submitting a
          pull request, you confirm that:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>You have the right to grant this license</li>
          <li>
            Your contribution does not infringe on any third-party intellectual
            property
          </li>
          <li>You agree to the Developer Certificate of Origin (DCO)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">8. Contact</h2>
        <p className="text-slate-700 leading-relaxed">
          For licensing questions, contact us at{" "}
          <a
            href="mailto:legal@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            legal@agentaflow.com
          </a>{" "}
          or visit the{" "}
          <a
            href="https://github.com/agentaflow/agentbase"
            className="text-brand-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Agentbase GitHub repository
          </a>
          .
        </p>
      </section>
    </div>
  );
}
