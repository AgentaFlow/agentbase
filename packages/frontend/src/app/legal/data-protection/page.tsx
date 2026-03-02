import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Protection – Agentbase",
  description:
    "Agentbase data protection commitments including GDPR compliance, data processing, and cross-border transfers.",
};

export default function DataProtection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Data Protection
        </h1>
        <p className="text-slate-500 text-sm">
          Effective Date: March 1, 2026 · Last Updated: March 1, 2026
        </p>
      </div>

      <p className="text-slate-700 leading-relaxed">
        AgentaFlow is committed to protecting the personal data of all Agentbase
        users. This Data Protection Policy outlines our technical and
        organizational measures, regulatory compliance approach, and the rights
        of data subjects under applicable data protection laws, including the
        General Data Protection Regulation (GDPR).
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          1. Data Controller &amp; Processor
        </h2>
        <p className="text-slate-700 leading-relaxed">
          For the hosted Agentbase SaaS platform, AgentaFlow acts as the{" "}
          <strong>Data Controller</strong> for account and platform data, and as
          a <strong>Data Processor</strong> for application content and AI
          conversation data processed on behalf of our users.
        </p>
        <p className="text-slate-700 leading-relaxed">
          For self-hosted Agentbase deployments, the deploying organization acts
          as the Data Controller and is responsible for its own data protection
          compliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          2. Legal Basis for Processing
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We process personal data under the following legal bases as defined by
          Article 6 of the GDPR:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Contract Performance (Art. 6(1)(b)):</strong> Processing
            necessary to provide the Service as agreed in our Terms of Use —
            including account management, subscription billing, and AI model
            inference
          </li>
          <li>
            <strong>Legitimate Interests (Art. 6(1)(f)):</strong> Processing for
            security monitoring, fraud prevention, service improvement, and
            analytics (balanced against data subject rights)
          </li>
          <li>
            <strong>Consent (Art. 6(1)(a)):</strong> Where applicable, such as
            optional marketing communications and non-essential cookies
          </li>
          <li>
            <strong>Legal Obligation (Art. 6(1)(c)):</strong> Processing
            required to comply with tax, financial reporting, and law
            enforcement obligations
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. Sub-Processors
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We engage the following categories of sub-processors to deliver the
          Service. Each sub-processor is bound by data processing agreements
          that ensure equivalent data protection standards:
        </p>

        <div className="bg-slate-50 border rounded-lg p-4">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Category</th>
                <th className="text-left py-2 font-medium">Providers</th>
                <th className="text-left py-2 font-medium">Data Processed</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">AI Model Providers</td>
                <td className="py-2">OpenAI, Anthropic, Google, HuggingFace</td>
                <td className="py-2">Prompts, conversation content</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Cloud Infrastructure</td>
                <td className="py-2">DigitalOcean</td>
                <td className="py-2">All platform data (encrypted)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Payment Processing</td>
                <td className="py-2">Stripe</td>
                <td className="py-2">Billing info, transaction records</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Email Delivery</td>
                <td className="py-2">SendGrid / AWS SES</td>
                <td className="py-2">Email addresses, notification content</td>
              </tr>
              <tr>
                <td className="py-2">Error Tracking</td>
                <td className="py-2">Sentry</td>
                <td className="py-2">Error logs, anonymized session data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-slate-700 leading-relaxed">
          We will notify users of material changes to our sub-processor list at
          least 30 days in advance by email or platform notification. Users may
          object to new sub-processors as described in their service agreement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Cross-Border Data Transfers
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Agentbase infrastructure is primarily hosted in the United States
          (DigitalOcean). Personal data from users in the European Economic Area
          (EEA), the United Kingdom, or Switzerland may be transferred
          internationally. We protect these transfers using:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Standard Contractual Clauses (SCCs):</strong> We use the
            European Commission&apos;s approved SCCs with all sub-processors
            that process EEA data outside adequacy countries
          </li>
          <li>
            <strong>Supplementary Measures:</strong> Encryption in transit (TLS
            1.2+) and at rest, pseudonymization where feasible, and access
            controls limiting data exposure
          </li>
          <li>
            <strong>Adequacy Decisions:</strong> Where applicable, we rely on
            relevant adequacy decisions
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Enterprise customers may request EU-only data residency as part of
          their service agreement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          5. Technical &amp; Organizational Measures
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We implement the following measures to protect personal data:
        </p>

        <h3 className="text-lg font-medium text-slate-800">
          5.1 Technical Measures
        </h3>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>TLS 1.2+ encryption for all data in transit</li>
          <li>
            AES-256 encryption for data at rest in databases and file storage
          </li>
          <li>Hashed and salted passwords (bcrypt)</li>
          <li>
            JWT-based authentication with short-lived access tokens and refresh
            token rotation
          </li>
          <li>
            Role-based access control (RBAC) for platform and administrative
            functions
          </li>
          <li>
            Network isolation between services using Kubernetes namespaces
          </li>
          <li>Automated vulnerability scanning in CI/CD pipelines</li>
          <li>Regular penetration testing by qualified third parties</li>
        </ul>

        <h3 className="text-lg font-medium text-slate-800">
          5.2 Organizational Measures
        </h3>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Data protection training for all employees with access to personal
            data
          </li>
          <li>Principle of least privilege for system access</li>
          <li>
            Comprehensive audit logging of all administrative and data access
            events
          </li>
          <li>Documented incident response procedures</li>
          <li>Regular review and update of security policies</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          6. Data Breach Notification
        </h2>
        <p className="text-slate-700 leading-relaxed">
          In the event of a personal data breach, we will:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Supervisory Authority:</strong> Notify the relevant data
            protection authority within 72 hours of becoming aware of the
            breach, as required by Article 33 of the GDPR (where applicable)
          </li>
          <li>
            <strong>Affected Users:</strong> Notify affected individuals without
            undue delay when the breach is likely to result in a high risk to
            their rights and freedoms (Article 34 of the GDPR)
          </li>
          <li>
            <strong>Business Customers:</strong> Notify affected customers (data
            controllers) within 48 hours so they can fulfill their own
            notification obligations
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Notifications will include the nature of the breach, categories and
          approximate number of affected individuals, likely consequences, and
          measures taken or proposed to mitigate effects.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          7. Data Processing Agreement (DPA)
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Enterprise and Pro customers may request a Data Processing Agreement
          that outlines the specific terms under which we process data on their
          behalf, including:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Scope and purpose of processing</li>
          <li>Categories of personal data and data subjects</li>
          <li>Technical and organizational security measures</li>
          <li>Sub-processor management and notification procedures</li>
          <li>Data subject rights assistance</li>
          <li>Data return and deletion upon contract termination</li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          To request a DPA, contact{" "}
          <a
            href="mailto:privacy@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            privacy@agentaflow.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          8. Data Subject Rights
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Under the GDPR and similar regulations, data subjects have the right
          to access, rectify, erase, restrict processing, port their data, and
          object to processing. Full details on exercising these rights are
          provided in our{" "}
          <a href="/legal/privacy" className="text-brand-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
        <p className="text-slate-700 leading-relaxed">
          We provide self-service tools in the dashboard for data export and
          account deletion. For other requests, contact{" "}
          <a
            href="mailto:privacy@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            privacy@agentaflow.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          9. Data Protection Impact Assessments
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We conduct Data Protection Impact Assessments (DPIAs) for processing
          activities that are likely to result in a high risk to data subjects,
          including:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>New AI model integrations that process personal data</li>
          <li>Changes to data processing infrastructure or sub-processors</li>
          <li>Implementation of new analytics or profiling features</li>
          <li>Significant changes to data retention or sharing practices</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">10. Contact</h2>
        <p className="text-slate-700 leading-relaxed">
          For data protection inquiries, contact our Data Protection Officer at{" "}
          <a
            href="mailto:dpo@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            dpo@agentaflow.com
          </a>{" "}
          or write to: AgentaFlow, Attn: Data Protection Officer.
        </p>
      </section>
    </div>
  );
}
