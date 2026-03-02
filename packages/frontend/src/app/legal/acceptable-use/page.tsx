import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy – Agentbase",
  description:
    "Rules governing permitted content and activities on the Agentbase platform.",
};

export default function AcceptableUsePolicy() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Acceptable Use Policy
        </h1>
        <p className="text-slate-500 text-sm">
          Effective Date: March 1, 2026 · Last Updated: March 1, 2026
        </p>
      </div>

      <p className="text-slate-700 leading-relaxed">
        This Acceptable Use Policy (&quot;AUP&quot;) defines the rules and
        standards of conduct for all users of the Agentbase platform. It applies
        to all content created, transmitted, or stored through the Service,
        including AI-generated content, marketplace submissions, and user
        interactions. This AUP is incorporated by reference into our Terms of
        Use.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          1. General Conduct
        </h2>
        <p className="text-slate-700 leading-relaxed">
          You agree to use the Service responsibly, lawfully, and in a manner
          that does not harm others or the platform. You must comply with all
          applicable local, national, and international laws and regulations
          when using the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          2. Prohibited Content
        </h2>
        <p className="text-slate-700 leading-relaxed">
          You may not use the Service to create, store, transmit, or distribute
          content that:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Is illegal, fraudulent, or promotes illegal activities</li>
          <li>
            Contains or distributes malware, viruses, or other malicious code
          </li>
          <li>
            Infringes on intellectual property rights, trademarks, or copyrights
            of others
          </li>
          <li>
            Contains private or personal information of others without their
            consent (doxxing)
          </li>
          <li>
            Constitutes harassment, hate speech, threats, or bullying directed
            at individuals or groups
          </li>
          <li>
            Contains sexually exploitative or abusive material, especially
            involving minors
          </li>
          <li>Promotes terrorism, extremist ideologies, or violence</li>
          <li>
            Is defamatory, libelous, or intentionally misleading
            (disinformation)
          </li>
          <li>
            Constitutes spam, unsolicited advertising, or phishing content
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. AI-Specific Restrictions
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Given the AI-powered nature of the platform, the following additional
          restrictions apply to AI model usage:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>No Safety Circumvention:</strong> Do not attempt to bypass,
            circumvent, or otherwise defeat the safety filters, content
            policies, or guardrails implemented by Agentbase or the underlying
            AI model providers (jailbreaking)
          </li>
          <li>
            <strong>No Impersonation:</strong> Do not use AI to generate content
            that impersonates real individuals, creates fake identities, or
            produces deepfake content without clear disclosure
          </li>
          <li>
            <strong>No Harmful Generation:</strong> Do not use AI models to
            generate instructions for creating weapons, drugs, or other
            dangerous materials
          </li>
          <li>
            <strong>No Deception:</strong> AI-generated content intended for
            public consumption must be clearly identified as AI-generated where
            applicable law requires such disclosure
          </li>
          <li>
            <strong>No Automated Decision-Making Without Oversight:</strong> Do
            not use AI outputs from the platform for fully automated decisions
            that significantly affect individuals (e.g., hiring, lending, legal
            determinations) without appropriate human oversight
          </li>
          <li>
            <strong>No Data Extraction:</strong> Do not use AI models to
            extract, reproduce, or reconstruct copyrighted training data or
            proprietary information
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Platform Abuse
        </h2>
        <p className="text-slate-700 leading-relaxed">You may not:</p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Attempt to gain unauthorized access to other accounts, systems, or
            data
          </li>
          <li>
            Interfere with or disrupt the Service or servers connected to the
            Service
          </li>
          <li>
            Use automated tools (bots, scrapers) to access the Service in ways
            that exceed normal usage patterns
          </li>
          <li>
            Reverse engineer, decompile, or disassemble any portion of the
            Service (except as permitted by GPL-3.0)
          </li>
          <li>
            Exploit vulnerabilities in the Service for unauthorized purposes
            (please report them via responsible disclosure)
          </li>
          <li>
            Create accounts for the purpose of abuse, circumventing bans, or
            inflating metrics
          </li>
          <li>
            Use the Service to conduct port scanning, network probing, or
            similar reconnaissance of third-party systems
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          5. Marketplace Rules
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Plugins and themes published to the Agentbase Marketplace must comply
          with this AUP and the following additional rules:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>No Malicious Code:</strong> Submissions must not contain
            backdoors, data exfiltration mechanisms, cryptocurrency miners, or
            any code that acts against the user&apos;s interests
          </li>
          <li>
            <strong>Accurate Descriptions:</strong> Plugin and theme listings
            must accurately describe functionality; bait-and-switch practices
            are prohibited
          </li>
          <li>
            <strong>Transparent Data Collection:</strong> If a plugin or theme
            collects user data, this must be clearly disclosed in the listing
            and require user consent
          </li>
          <li>
            <strong>Licensing Compliance:</strong> All submissions must comply
            with the licensing requirements outlined in our{" "}
            <a
              href="/legal/licensing"
              className="text-brand-600 hover:underline"
            >
              Licensing
            </a>{" "}
            policy
          </li>
          <li>
            <strong>No Review Manipulation:</strong> Purchasing, incentivizing,
            or fabricating reviews and ratings is prohibited
          </li>
          <li>
            <strong>Responsiveness:</strong> Developers of published marketplace
            items must maintain a reasonable level of responsiveness to user
            issues and security reports
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          6. Security &amp; Vulnerability Disclosure
        </h2>
        <p className="text-slate-700 leading-relaxed">
          If you discover a security vulnerability in the Agentbase platform:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Report it to{" "}
            <a
              href="mailto:security@agentaflow.com"
              className="text-brand-600 hover:underline"
            >
              security@agentaflow.com
            </a>{" "}
            or via our{" "}
            <a
              href="https://github.com/agentaflow/agentbase/security"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Security Advisories
            </a>
          </li>
          <li>
            Do not publicly disclose the vulnerability until we have had a
            reasonable opportunity to address it
          </li>
          <li>
            Do not access, modify, or delete data belonging to other users as
            part of your research
          </li>
          <li>
            We will acknowledge responsible disclosures and credit reporters
            (with consent)
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. Enforcement</h2>
        <p className="text-slate-700 leading-relaxed">
          Violations of this AUP may result in one or more of the following
          actions, applied at our discretion based on severity:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-2">
          <li>
            <strong>Warning:</strong> Written notice of the violation and
            required corrective action
          </li>
          <li>
            <strong>Content Removal:</strong> Removal or disabling of offending
            content, plugins, or themes
          </li>
          <li>
            <strong>Feature Restriction:</strong> Temporary or permanent
            restriction of specific platform features (e.g., marketplace
            publishing, AI model access)
          </li>
          <li>
            <strong>Account Suspension:</strong> Temporary suspension of account
            access
          </li>
          <li>
            <strong>Account Termination:</strong> Permanent closure of the
            account and forfeiture of remaining subscription fees
          </li>
          <li>
            <strong>Legal Action:</strong> Referral to law enforcement or
            initiation of legal proceedings for severe violations
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          We will generally provide notice before taking action (except in
          urgent cases involving safety, security, or legal requirements). You
          may appeal enforcement decisions within 14 days by contacting{" "}
          <a
            href="mailto:support@agentaflow.com"
            className="text-brand-600 hover:underline"
          >
            support@agentaflow.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          8. Reporting Violations
        </h2>
        <p className="text-slate-700 leading-relaxed">
          If you encounter content or behavior that violates this AUP, please
          report it:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Marketplace content:</strong> Use the &quot;Report&quot;
            button on any plugin or theme listing
          </li>
          <li>
            <strong>Security issues:</strong> Email{" "}
            <a
              href="mailto:security@agentaflow.com"
              className="text-brand-600 hover:underline"
            >
              security@agentaflow.com
            </a>
          </li>
          <li>
            <strong>General violations:</strong> Email{" "}
            <a
              href="mailto:abuse@agentaflow.com"
              className="text-brand-600 hover:underline"
            >
              abuse@agentaflow.com
            </a>
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          We review all reports and will respond within 5 business days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          9. Changes to This Policy
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We may update this AUP as the platform evolves. Material changes will
          be communicated via the Service or email at least 14 days before they
          take effect. Continued use of the Service after changes take effect
          constitutes acceptance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">10. Contact</h2>
        <p className="text-slate-700 leading-relaxed">
          For questions about this Acceptable Use Policy, contact{" "}
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
