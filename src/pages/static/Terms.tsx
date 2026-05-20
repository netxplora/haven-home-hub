import { SiteLayout } from "@/components/site/SiteLayout";
import { SEO } from "@/components/site/SEO";

export default function Terms() {
  return (
    <SiteLayout>
      <SEO title="Terms of Service" description="Verdant Estate Terms of Service. Please read these terms carefully before using our platform." />
      {/* Hero Header */}
      <div className="relative overflow-hidden min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] flex items-center bg-black">
        <img
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1920&q=80"
          alt="Terms and conditions"
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-hero-emerald mix-blend-multiply opacity-60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2]" />
        
        <div className="container-wide relative z-10 text-primary-foreground">
          <p className="mb-2 text-sm font-medium tracking-wider uppercase text-primary">Legal</p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold sm:text-5xl text-white leading-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-white/60">Last updated: May 1, 2026</p>
        </div>
      </div>

      {/* Content */}
      <section className="container-tight py-16 sm:py-24">
        <div className="prose prose-sm sm:prose max-w-none text-muted-foreground
          prose-headings:font-serif prose-headings:text-foreground prose-headings:font-semibold
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
          prose-p:leading-relaxed prose-p:mb-4
          prose-li:leading-relaxed
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-strong:text-foreground">

          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using the Verdant Estate platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Platform. These Terms apply to all visitors, users, and others who access the Platform.
          </p>

          <h2>2. Platform Description</h2>
          <p>
            Verdant Estate is a real estate agency platform that provides property listings (for sale, rent, and land), fractional investment opportunities, agent directory services, and related financial tools. The Platform connects buyers, tenants, and investors with verified properties and licensed agents.
          </p>

          <h2>3. User Accounts</h2>
          <h3>3.1 Registration</h3>
          <p>
            To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
          </p>
          <h3>3.2 Account Security</h3>
          <p>
            You are responsible for safeguarding the password associated with your account. You agree not to disclose your password to any third party and to notify us immediately if you become aware of any unauthorized use.
          </p>
          <h3>3.3 Account Termination</h3>
          <p>
            We reserve the right to suspend or terminate your account at any time for any reason, including but not limited to violation of these Terms.
          </p>

          <h2>4. Property Listings</h2>
          <p>
            All property listings on the Platform are provided for informational purposes only. While we take reasonable steps to verify listing accuracy, we do not guarantee the completeness, reliability, or accuracy of any listing information. Property availability, pricing, and specifications are subject to change without notice.
          </p>

          <h2>5. Investment Services</h2>
          <h3>5.1 Fractional Ownership</h3>
          <p>
            Verdant Estate facilitates fractional property ownership through unit-based investment structures. Each investment opportunity is subject to its own terms, including minimum investment amounts, holding periods, distribution schedules, and projected return ranges.
          </p>
          <h3>5.2 Risk Disclosure</h3>
          <p>
            All investments carry risk. Projected returns are estimates and are not guaranteed. Past performance does not indicate future results. You should only invest amounts you can afford to lose. We strongly recommend consulting a qualified financial advisor before making any investment decisions.
          </p>
          <h3>5.3 Unit Allocation</h3>
          <p>
            Investment units are allocated on a first-come, first-served basis. Once an investment property reaches full funding, no additional units will be available. Unit allocations are final once payment is confirmed.
          </p>

          <h2>6. Payments</h2>
          <h3>6.1 Payment Methods</h3>
          <p>
            The Platform supports multiple payment methods including bank transfer, card payments, and digital currency. All payment processing is handled through verified third-party providers.
          </p>
          <h3>6.2 Refunds</h3>
          <p>
            Refund eligibility depends on the type of transaction. Property booking deposits may be refundable within 48 hours. Investment payments are generally non-refundable once units have been allocated. Please review specific refund terms before completing any transaction.
          </p>
          <h3>6.3 Digital Currency Payments</h3>
          <p>
            Digital currency payments are subject to network confirmation requirements. Exchange rates are locked at the time of payment initiation and remain valid for a limited period. Verdant Estate is not responsible for losses due to digital currency price fluctuations after a payment is initiated.
          </p>

          <h2>7. Withdrawals</h2>
          <p>
            Users may request withdrawal of available balances (from investment returns or other credits) through supported withdrawal methods. Withdrawals are subject to review and may require identity verification. Processing times vary by method and are typically completed within 3–5 business days for bank transfers.
          </p>

          <h2>8. Intellectual Property</h2>
          <p>
            The Platform and its original content, features, and functionality are owned by Verdant Estate and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
          </p>

          <h2>9. Prohibited Activities</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Platform for any unlawful purpose</li>
            <li>Submit false or misleading information</li>
            <li>Attempt to gain unauthorized access to any part of the Platform</li>
            <li>Interfere with the proper operation of the Platform</li>
            <li>Engage in money laundering or other financial crimes</li>
            <li>Use automated systems to scrape or extract data from the Platform</li>
          </ul>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Verdant Estate shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of profits, data, or investment returns.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the United States of America, without regard to its conflict of law provisions.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Platform. Your continued use of the Platform after any changes constitutes your acceptance of the new Terms.
          </p>

          <h2>13. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at{" "}
            <a href="mailto:legal@verdantestate.com">legal@verdantestate.com</a>.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
