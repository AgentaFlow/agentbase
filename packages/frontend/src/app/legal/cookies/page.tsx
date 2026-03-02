import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy – Agentbase",
  description:
    "Information about cookies and similar technologies used by the Agentbase platform.",
};

export default function CookiePolicy() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Cookie Policy
        </h1>
        <p className="text-slate-500 text-sm">
          Effective Date: March 1, 2026 · Last Updated: March 1, 2026
        </p>
      </div>

      <p className="text-slate-700 leading-relaxed">
        This Cookie Policy explains how AgentaFlow (&quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;) uses cookies and similar
        technologies when you access or use the Agentbase platform (the
        &quot;Service&quot;). It explains what these technologies are, why we
        use them, and your choices regarding their use.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          1. What Are Cookies?
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Cookies are small text files placed on your device by a website or
          application. They are widely used to make services work efficiently,
          provide reporting information, and assist with personalization.
          Cookies set by the service operator are called &quot;first-party
          cookies.&quot; Cookies set by parties other than the operator are
          called &quot;third-party cookies.&quot;
        </p>
        <p className="text-slate-700 leading-relaxed">
          Similar technologies include local storage, session storage, and pixel
          tags, which serve comparable purposes and are covered by this policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          2. Cookies We Use
        </h2>

        <h3 className="text-lg font-medium text-slate-800">
          2.1 Strictly Necessary Cookies
        </h3>
        <p className="text-slate-700 leading-relaxed">
          These cookies are essential for the Service to function. They cannot
          be disabled. They include:
        </p>
        <div className="bg-slate-50 border rounded-lg p-4">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Cookie</th>
                <th className="text-left py-2 font-medium">Purpose</th>
                <th className="text-left py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono text-xs">ab_access_token</td>
                <td className="py-2">
                  JWT access token for authenticated sessions
                </td>
                <td className="py-2">15 minutes</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono text-xs">ab_refresh_token</td>
                <td className="py-2">
                  Refresh token for renewing authentication
                </td>
                <td className="py-2">7 days</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono text-xs">ab_session</td>
                <td className="py-2">Session identifier</td>
                <td className="py-2">Session</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-xs">ab_csrf</td>
                <td className="py-2">CSRF protection token</td>
                <td className="py-2">Session</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium text-slate-800">
          2.2 Functional Cookies
        </h3>
        <p className="text-slate-700 leading-relaxed">
          These cookies enable enhanced functionality and personalization:
        </p>
        <div className="bg-slate-50 border rounded-lg p-4">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Cookie</th>
                <th className="text-left py-2 font-medium">Purpose</th>
                <th className="text-left py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono text-xs">ab_theme</td>
                <td className="py-2">Stores your selected theme preference</td>
                <td className="py-2">1 year</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono text-xs">ab_locale</td>
                <td className="py-2">Language and locale preference</td>
                <td className="py-2">1 year</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-xs">ab_sidebar</td>
                <td className="py-2">
                  Dashboard sidebar collapsed/expanded state
                </td>
                <td className="py-2">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium text-slate-800">
          2.3 Analytics Cookies
        </h3>
        <p className="text-slate-700 leading-relaxed">
          These cookies help us understand how users interact with the Service
          so we can improve it. They collect information in an aggregated,
          anonymized form:
        </p>
        <div className="bg-slate-50 border rounded-lg p-4">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Cookie</th>
                <th className="text-left py-2 font-medium">Provider</th>
                <th className="text-left py-2 font-medium">Purpose</th>
                <th className="text-left py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono text-xs">_ab_analytics</td>
                <td className="py-2">Agentbase</td>
                <td className="py-2">Internal usage analytics</td>
                <td className="py-2">30 days</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-xs">_ab_session_id</td>
                <td className="py-2">Agentbase</td>
                <td className="py-2">Session tracking for analytics</td>
                <td className="py-2">Session</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-slate-700 leading-relaxed">
          We currently use first-party analytics only. If we introduce
          third-party analytics services in the future, this policy will be
          updated accordingly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. Local Storage
        </h2>
        <p className="text-slate-700 leading-relaxed">
          In addition to cookies, we use browser local storage for:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Draft Content:</strong> Unsaved application configurations
            and prompt drafts
          </li>
          <li>
            <strong>UI State:</strong> Dashboard layout preferences, filter
            settings, and recently used items
          </li>
          <li>
            <strong>Performance:</strong> Cached API responses and static assets
            for faster loading
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Local storage data is stored on your device only and is not
          transmitted to our servers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Your Choices
        </h2>

        <h3 className="text-lg font-medium text-slate-800">
          4.1 Browser Settings
        </h3>
        <p className="text-slate-700 leading-relaxed">
          Most browsers allow you to manage cookie preferences through their
          settings. You can:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Block all cookies (note: this will prevent the Service from
            functioning)
          </li>
          <li>Block third-party cookies only</li>
          <li>Delete existing cookies</li>
          <li>Set your browser to notify you when cookies are being set</li>
        </ul>

        <h3 className="text-lg font-medium text-slate-800">
          4.2 Essential vs. Optional
        </h3>
        <p className="text-slate-700 leading-relaxed">
          Strictly necessary cookies cannot be disabled as they are required for
          the Service to operate. Functional and analytics cookies can be
          managed through your browser settings. Disabling functional cookies
          may reduce personalization features but will not prevent core platform
          access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          5. Updates to This Policy
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We may update this Cookie Policy to reflect changes in our practices
          or applicable regulations. Material changes will be communicated via
          the Service or by email. The &quot;Last Updated&quot; date at the top
          indicates when the policy was last revised.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Contact</h2>
        <p className="text-slate-700 leading-relaxed">
          For questions about our use of cookies, contact us at{" "}
          <a
            href="mailto:privacy@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            privacy@agentaflow.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
