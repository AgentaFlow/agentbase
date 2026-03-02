import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fair Use Policy – Agentbase",
  description:
    "Guidelines for responsible use of Agentbase platform resources and AI models.",
};

export default function FairUsePolicy() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Fair Use Policy
        </h1>
        <p className="text-slate-500 text-sm">
          Effective Date: March 1, 2026 · Last Updated: March 1, 2026
        </p>
      </div>

      <p className="text-slate-700 leading-relaxed">
        This Fair Use Policy outlines the expected and acceptable levels of
        resource consumption on the Agentbase platform. It ensures that all
        users have equitable access to platform services and that shared
        infrastructure remains reliable and performant.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. Purpose</h2>
        <p className="text-slate-700 leading-relaxed">
          Agentbase provides shared infrastructure for AI application
          development, hosting, and model inference. This policy exists to
          prevent abuse, ensure service quality for all users, and maintain the
          operational integrity of the platform. It applies to all users of the
          hosted Service regardless of subscription tier.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          2. AI Model Usage Limits
        </h2>
        <p className="text-slate-700 leading-relaxed">
          AI model inference is a shared resource. The following guidelines
          apply:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Rate Limits:</strong> Each subscription tier includes
            defined rate limits for API calls and AI inference requests.
            Exceeding these limits may result in temporary throttling.
          </li>
          <li>
            <strong>Token Quotas:</strong> Monthly token quotas apply based on
            your plan. Usage beyond your quota is billed at the applicable
            overage rate or may be throttled.
          </li>
          <li>
            <strong>Concurrent Requests:</strong> Simultaneous API and inference
            requests are limited by tier to prevent any single user from
            consuming disproportionate resources.
          </li>
          <li>
            <strong>Streaming Sessions:</strong> Long-running streaming
            connections should be used for their intended purpose (real-time AI
            responses) and not kept open indefinitely.
          </li>
        </ul>

        <div className="bg-slate-50 border rounded-lg p-4 mt-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Indicative Limits by Plan
          </h3>
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Resource</th>
                <th className="text-left py-2 font-medium">Free</th>
                <th className="text-left py-2 font-medium">Pro</th>
                <th className="text-left py-2 font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">API Requests / min</td>
                <td className="py-2">60</td>
                <td className="py-2">600</td>
                <td className="py-2">Custom</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">AI Tokens / month</td>
                <td className="py-2">100K</td>
                <td className="py-2">2M</td>
                <td className="py-2">Custom</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Concurrent Connections</td>
                <td className="py-2">5</td>
                <td className="py-2">50</td>
                <td className="py-2">Custom</td>
              </tr>
              <tr>
                <td className="py-2">Storage</td>
                <td className="py-2">1 GB</td>
                <td className="py-2">50 GB</td>
                <td className="py-2">Custom</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            These limits are indicative and subject to change. Current limits
            are displayed in your dashboard.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. Platform Resource Guidelines
        </h2>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Applications:</strong> Each account may create a reasonable
            number of applications consistent with its plan tier. Creating
            excessive unused applications to reserve names is not permitted.
          </li>
          <li>
            <strong>Plugins &amp; Themes:</strong> Installed plugins should
            serve a functional purpose. Excessively installing and uninstalling
            plugins for the purpose of inflating marketplace metrics is
            prohibited.
          </li>
          <li>
            <strong>Webhooks:</strong> Webhook endpoints must be responsive.
            Endpoints that consistently fail or time out may be automatically
            disabled.
          </li>
          <li>
            <strong>File Uploads:</strong> Storage quotas apply per plan.
            Uploading content that is not related to your application use cases
            (e.g., using Agentbase as general file hosting) is not permitted.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Marketplace Developer Conduct
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Developers who publish to the Agentbase Marketplace must adhere to the
          following:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Submissions must be functional, accurately described, and free from
            malicious code
          </li>
          <li>
            Pricing must be transparent — no hidden fees or bait-and-switch
            tactics
          </li>
          <li>
            Developers must respond to user support requests in a timely manner
          </li>
          <li>
            Artificial inflation of download counts, ratings, or reviews is
            strictly prohibited
          </li>
          <li>
            Plugins and themes must not collect user data beyond what is
            disclosed and necessary for functionality
          </li>
          <li>
            Submissions must comply with all applicable licensing requirements
            (see Licensing policy)
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          5. Prohibited Patterns
        </h2>
        <p className="text-slate-700 leading-relaxed">
          The following usage patterns are considered abuse and may result in
          throttling, suspension, or termination:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Automated scraping of AI responses for dataset creation without
            authorization
          </li>
          <li>
            Using the platform to generate spam, phishing content, or fraudulent
            materials
          </li>
          <li>
            Reselling AI model access outside the Agentbase platform without a
            partnership agreement
          </li>
          <li>
            Attempting to circumvent rate limits, quotas, or billing mechanisms
          </li>
          <li>
            Mining cryptocurrency or running unrelated computational workloads
          </li>
          <li>
            Overloading shared infrastructure with denial-of-service patterns
            (intentional or negligent)
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Enforcement</h2>
        <p className="text-slate-700 leading-relaxed">
          We monitor platform usage to ensure compliance with this policy.
          Enforcement actions are proportionate and may include:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-2">
          <li>
            <strong>Notice:</strong> An email notification describing the
            violation and requesting corrective action
          </li>
          <li>
            <strong>Throttling:</strong> Temporary rate limit reductions on the
            affected account
          </li>
          <li>
            <strong>Suspension:</strong> Temporary suspension of account access
            pending investigation
          </li>
          <li>
            <strong>Termination:</strong> Permanent account closure for severe
            or repeated violations
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Users may appeal enforcement actions by contacting{" "}
          <a
            href="mailto:support@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            support@agentaflow.com
          </a>{" "}
          within 14 days of the action.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. Contact</h2>
        <p className="text-slate-700 leading-relaxed">
          Questions about this Fair Use Policy may be directed to{" "}
          <a
            href="mailto:legal@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            legal@agentaflow.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
