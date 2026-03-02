import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use – Agentbase",
  description:
    "Terms governing your use of the Agentbase platform and services.",
};

export default function TermsOfUse() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Use</h1>
        <p className="text-slate-500 text-sm">
          Effective Date: March 1, 2026 · Last Updated: March 1, 2026
        </p>
      </div>

      <p className="text-slate-700 leading-relaxed">
        These Terms of Use (&quot;Terms&quot;) constitute a legally binding
        agreement between you (&quot;User,&quot; &quot;you,&quot; or
        &quot;your&quot;) and AgentaFlow (&quot;Company,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;), governing your access to and use of
        the Agentbase platform, including all associated services, applications,
        APIs, and the marketplace (collectively, the &quot;Service&quot;). By
        accessing or using the Service, you agree to be bound by these Terms.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          1. Acceptance of Terms
        </h2>
        <p className="text-slate-700 leading-relaxed">
          By creating an account, accessing, or using the Service, you
          acknowledge that you have read, understood, and agree to be bound by
          these Terms and our Privacy Policy. If you are using the Service on
          behalf of an organization, you represent and warrant that you have the
          authority to bind that organization to these Terms.
        </p>
        <p className="text-slate-700 leading-relaxed">
          If you do not agree to these Terms, you must not access or use the
          Service. We reserve the right to modify these Terms at any time.
          Continued use of the Service after modifications constitutes
          acceptance of the updated Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          2. Account Registration &amp; Security
        </h2>
        <p className="text-slate-700 leading-relaxed">
          To access certain features of the Service, you must create an account.
          You agree to:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Provide accurate, current, and complete registration information
          </li>
          <li>
            Maintain the security of your account credentials and API keys
          </li>
          <li>Promptly notify us of any unauthorized access to your account</li>
          <li>
            Accept responsibility for all activities that occur under your
            account
          </li>
          <li>
            Not share your account with others or create multiple accounts for
            abusive purposes
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          We reserve the right to suspend or terminate accounts that violate
          these Terms, contain false information, or remain inactive for
          extended periods.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. Service Description
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Agentbase is an open-source platform for building, deploying, and
          managing AI-powered applications. The Service includes:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            <strong>Platform Core:</strong> Application management, plugin
            system, theme engine, and administrative dashboard
          </li>
          <li>
            <strong>AI Integration:</strong> Multi-provider AI model access
            (OpenAI, Anthropic, Google Gemini, HuggingFace) for inference,
            conversation, and content generation
          </li>
          <li>
            <strong>Marketplace:</strong> A marketplace for discovering,
            purchasing, and distributing plugins and themes
          </li>
          <li>
            <strong>Hosted SaaS:</strong> Managed hosting, billing, and
            infrastructure for users who prefer not to self-host
          </li>
          <li>
            <strong>Self-Hosted:</strong> An installable framework that users
            may deploy on their own infrastructure
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Subscription Plans &amp; Billing
        </h2>
        <p className="text-slate-700 leading-relaxed">
          Access to the hosted Service is available under subscription plans
          (Free, Pro, and Enterprise). By subscribing to a paid plan, you agree
          to:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Pay all fees associated with your selected plan on a monthly or
            annual basis
          </li>
          <li>Provide valid and current payment information</li>
          <li>
            Authorize recurring charges until you cancel your subscription
          </li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Fees are non-refundable except as required by applicable law or as
          expressly stated in our refund policy. We may change pricing with 30
          days&apos; prior notice. Usage-based charges (such as AI model
          inference) are billed in addition to your base subscription fee.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          5. AI Model Usage
        </h2>
        <p className="text-slate-700 leading-relaxed">
          The Service provides access to third-party AI models. You acknowledge
          and agree that:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            AI-generated outputs are provided &quot;as is&quot; without
            warranties of accuracy or fitness
          </li>
          <li>
            You are responsible for reviewing and validating AI outputs before
            use
          </li>
          <li>
            Your use of AI models is subject to the respective provider&apos;s
            terms of service
          </li>
          <li>
            We may impose usage limits, rate limits, or quotas on AI model
            access
          </li>
          <li>
            Input data sent to AI providers may be processed according to those
            providers&apos; policies
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Marketplace</h2>
        <p className="text-slate-700 leading-relaxed">
          The Agentbase Marketplace allows users to publish and consume plugins
          and themes. As a marketplace participant:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>
            Developers retain ownership of their plugins and themes but grant
            Agentbase a license to distribute them
          </li>
          <li>
            Revenue sharing applies to paid marketplace items as specified in
            the Developer Agreement
          </li>
          <li>
            We reserve the right to remove any marketplace submission that
            violates our policies
          </li>
          <li>
            We do not guarantee the quality, safety, or functionality of
            third-party marketplace items
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          7. Intellectual Property
        </h2>
        <p className="text-slate-700 leading-relaxed">
          The Agentbase platform is released under the GNU General Public
          License v3.0 (GPL-3.0). You retain ownership of all content you create
          using the Service. We retain ownership of the Agentbase brand, logos,
          trademarks, and any proprietary components not covered by the GPL-3.0
          license.
        </p>
        <p className="text-slate-700 leading-relaxed">
          You grant us a non-exclusive, worldwide, royalty-free license to host,
          display, and distribute your content as necessary to provide the
          Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          8. Service Availability &amp; Modifications
        </h2>
        <p className="text-slate-700 leading-relaxed">
          We strive to maintain high availability but do not guarantee
          uninterrupted access. We may:
        </p>
        <ul className="list-disc pl-6 text-slate-700 space-y-1">
          <li>Perform scheduled maintenance with reasonable advance notice</li>
          <li>Modify, suspend, or discontinue features of the Service</li>
          <li>Experience downtime due to circumstances beyond our control</li>
        </ul>
        <p className="text-slate-700 leading-relaxed">
          Enterprise customers with SLA agreements are governed by the terms of
          their specific agreements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          9. Limitation of Liability
        </h2>
        <p className="text-slate-700 leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
          AGENTAFLOW, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS
          BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, GOODWILL, OR
          OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE
          OF THE SERVICE.
        </p>
        <p className="text-slate-700 leading-relaxed">
          Our total aggregate liability for any claims arising from these Terms
          shall not exceed the amount you paid to us in the twelve (12) months
          preceding the claim.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          10. Termination
        </h2>
        <p className="text-slate-700 leading-relaxed">
          You may terminate your account at any time by contacting us or using
          the account deletion feature. We may terminate or suspend your access
          immediately, without prior notice, for conduct that we believe
          violates these Terms or is harmful to other users or the Service.
        </p>
        <p className="text-slate-700 leading-relaxed">
          Upon termination, your right to use the Service ceases immediately. We
          will make your data available for export for a period of 30 days
          following termination, after which it may be permanently deleted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          11. Governing Law &amp; Dispute Resolution
        </h2>
        <p className="text-slate-700 leading-relaxed">
          These Terms shall be governed by and construed in accordance with the
          laws of the State of Delaware, United States, without regard to
          conflict of law principles. Any disputes arising from these Terms
          shall first be subject to good-faith negotiation, followed by binding
          arbitration administered in accordance with the rules of the American
          Arbitration Association.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">12. Contact</h2>
        <p className="text-slate-700 leading-relaxed">
          For questions about these Terms, please contact us at{" "}
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
