import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – Agentbase",
  description:
    "How Agentbase collects, uses, and protects your personal information.",
};

export default function PrivacyPolicy() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-slate-500 text-sm">
          Effective Date: March 1, 2026 · Last Updated: March 1, 2026
        </p>
      </div>

      <p className="text-slate-700 leading-relaxed">
        AgentaFlow (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;) is committed to protecting your privacy. This Privacy
        Policy explains how we collect, use, disclose, and safeguard your
        information when you use the Agentbase platform and related services
        (the &quot;Service&quot;).
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          1. Information We Collect
        </h2>

        <h3 className="text-lg font-medium text-slate-800">
          1.1 Information You Provide
        </h3>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Account Information:</strong> Name, email address, password
            (hashed), and organization name when you register
          </li>
          <li>
            <strong>Profile Information:</strong> Avatar, bio, and other
            optional profile details
          </li>
          <li>
            <strong>Payment Information:</strong> Billing address and payment
            method details processed securely through Stripe; we do not store
            full credit card numbers
          </li>
          <li>
            <strong>Content:</strong> Applications, plugins, themes, prompts,
            and configurations you create on the platform
          </li>
          <li>
            <strong>Communications:</strong> Messages you send to us via support
            channels, email, or GitHub Issues
          </li>
        </ul>

        <h3 className="text-lg font-medium text-slate-800">
          1.2 Information Collected Automatically
        </h3>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Usage Data:</strong> Pages visited, features used, API calls
            made, timestamps, and session duration
          </li>
          <li>
            <strong>Device Information:</strong> Browser type, operating system,
            device identifiers, and screen resolution
          </li>
          <li>
            <strong>Log Data:</strong> IP address, access times, referring URLs,
            and error logs
          </li>
          <li>
            <strong>Cookies &amp; Tracking:</strong> Authentication tokens,
            session identifiers, and analytics cookies (see our Cookie Policy)
          </li>
        </ul>

        <h3 className="text-lg font-medium text-slate-800">
          1.3 AI Interaction Data
        </h3>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Conversation Metadata:</strong> Timestamps, model used,
            token counts, and conversation identifiers
          </li>
          <li>
            <strong>Prompts &amp; Responses:</strong> The content of prompts and
            AI-generated responses may be temporarily stored for service
            delivery and debugging
          </li>
          <li>
            <strong>Model Configuration:</strong> Your AI model preferences,
            temperature settings, and system prompts
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          We do not use your AI conversation content to train AI models.
          Conversation content sent to third-party AI providers is subject to
          their respective privacy policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          2. How We Use Your Information
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Provide, operate, and maintain the Service</li>
          <li>Process transactions and manage your subscription</li>
          <li>Authenticate your identity and secure your account</li>
          <li>Route your requests to the appropriate AI model providers</li>
          <li>Monitor and analyze usage patterns to improve the Service</li>
          <li>
            Detect, prevent, and address fraud, abuse, and security threats
          </li>
          <li>
            Send service-related communications (account notifications, security
            alerts, billing updates)
          </li>
          <li>Enforce our Terms of Use and other policies</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. Information Sharing &amp; Third Parties
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We do not sell your personal information. We share information with
          third parties only in the following circumstances:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>AI Model Providers:</strong> OpenAI, Anthropic, Google
            (Gemini), and HuggingFace receive prompt data necessary to generate
            AI responses. Each provider processes data under their own privacy
            policy.
          </li>
          <li>
            <strong>Payment Processors:</strong> Stripe processes payment
            information on our behalf under PCI DSS compliance.
          </li>
          <li>
            <strong>Infrastructure Providers:</strong> DigitalOcean and related
            cloud providers host our services and may process data in accordance
            with their privacy commitments.
          </li>
          <li>
            <strong>Analytics Services:</strong> We may use analytics tools to
            understand aggregate usage patterns (data is anonymized where
            possible).
          </li>
          <li>
            <strong>Legal Requirements:</strong> We may disclose information
            when required by law, court order, or governmental authority.
          </li>
          <li>
            <strong>Business Transfers:</strong> In the event of a merger,
            acquisition, or sale of assets, your information may be transferred
            as part of the transaction.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Data Retention
        </h2>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Account Data:</strong> Retained for the duration of your
            account plus 30 days after deletion
          </li>
          <li>
            <strong>AI Conversations:</strong> Stored for the duration of your
            account; may be purged from backups within 90 days of account
            deletion
          </li>
          <li>
            <strong>Usage &amp; Analytics Data:</strong> Retained in
            anonymized/aggregated form for up to 24 months
          </li>
          <li>
            <strong>Payment Records:</strong> Retained as required by tax and
            financial regulations (typically 7 years)
          </li>
          <li>
            <strong>Audit Logs:</strong> Retained for 12 months for security and
            compliance purposes
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Your Rights</h2>
        <p className="text-slate-700 leading-relaxed">
          Depending on your jurisdiction, you may have the following rights
          regarding your personal data:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Access:</strong> Request a copy of the personal data we hold
            about you
          </li>
          <li>
            <strong>Rectification:</strong> Request correction of inaccurate or
            incomplete data
          </li>
          <li>
            <strong>Erasure:</strong> Request deletion of your personal data
            (subject to legal retention requirements)
          </li>
          <li>
            <strong>Portability:</strong> Request your data in a structured,
            machine-readable format
          </li>
          <li>
            <strong>Restriction:</strong> Request limitation of processing in
            certain circumstances
          </li>
          <li>
            <strong>Objection:</strong> Object to processing based on legitimate
            interests
          </li>
          <li>
            <strong>Withdrawal of Consent:</strong> Withdraw consent where
            processing is based on consent
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          To exercise any of these rights, contact us at{" "}
          <a
            href="mailto:privacy@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            privacy@agentaflow.com
          </a>
          . We will respond within 30 days. See our Data Protection policy for
          additional details on GDPR compliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Security</h2>
        <p className="text-slate-700 leading-relaxed">
          We implement industry-standard security measures to protect your data,
          including:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>TLS/SSL encryption for all data in transit</li>
          <li>Encryption at rest for sensitive data stores</li>
          <li>JWT-based authentication with secure token handling</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Role-based access control (RBAC) for internal systems</li>
          <li>
            Audit logging of administrative and security-sensitive actions
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          No method of transmission or storage is 100% secure. While we strive
          to protect your data, we cannot guarantee absolute security.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          7. Children&apos;s Privacy
        </h2>
        <p className="text-slate-700 leading-relaxed">
          The Service is not directed to children under the age of 16. We do not
          knowingly collect personal information from children. If we learn that
          we have collected data from a child under 16, we will delete it
          promptly. If you believe a child has provided us with personal
          information, please contact us at{" "}
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
          8. International Data Transfers
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Your information may be transferred to and processed in countries
          other than your country of residence. Where we transfer data
          internationally, we ensure appropriate safeguards are in place,
          including Standard Contractual Clauses (SCCs) approved by the European
          Commission and adequacy decisions where applicable. See our Data
          Protection policy for full details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          9. Changes to This Policy
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We may update this Privacy Policy periodically. We will notify you of
          material changes by posting a notice on the Service or sending you an
          email. Your continued use of the Service after any changes constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">10. Contact</h2>
        <p className="text-slate-700 leading-relaxed">
          For privacy-related questions or requests, contact our Data Protection
          team at{" "}
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
