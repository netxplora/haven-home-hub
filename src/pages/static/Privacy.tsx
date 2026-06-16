import { SiteLayout } from "@/components/site/SiteLayout";
import { SEO } from "@/components/site/SEO";
import { useBrand } from "@/hooks/useBrand";

export default function Privacy() {
  const { brand } = useBrand();
  return (
    <SiteLayout>
      <SEO title="Privacy Policy" description={`${brand.platform_name} Privacy Policy. Learn how we collect, use, and protect your information.`} />
      {/* Header */}
      <section className="relative overflow-hidden min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] flex items-center bg-black">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-hero-rose mix-blend-multiply opacity-60 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[2]" />
        
        <div className="container-wide relative z-10 text-primary-foreground text-center">
          <p className="mb-2 text-sm font-medium tracking-wider text-primary uppercase">Legal</p>
          <h1 className="font-serif text-4xl font-semibold sm:text-5xl text-white">
            Privacy <span className="text-secondary">Policy</span>
          </h1>
          <p className="mt-4 text-sm text-white/60">Last updated: May 1, 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="container-tight py-20">
        <div className="prose prose-sm md:prose-base max-w-none space-y-10 text-foreground/85">
          
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-8 shadow-sm">
            <h2 className="font-serif text-2xl font-semibold text-primary mb-4">1. Information we collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information that you provide directly when creating an account, submitting inquiries, booking property inspections, or making investment transactions. This includes your name, email address, phone number, and payment-related details.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We also collect usage data automatically, including pages visited, device information, IP addresses, and browser type. This data helps us improve site performance and user experience.
            </p>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">2. How we use your information</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground leading-relaxed list-disc list-inside marker:text-primary">
              <li>To provide and maintain our platform services</li>
              <li>To process property inquiries, bookings, and investment transactions</li>
              <li>To communicate with you about your account, transactions, and platform updates</li>
              <li>To verify identity and prevent fraud</li>
              <li>To improve our services based on aggregated usage data</li>
              <li>To comply with applicable laws and regulations</li>
            </ul>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">3. Data sharing</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We do not sell your personal data. We share information only with service providers necessary to operate the platform (payment processors, hosting infrastructure, communication tools). We may also share data when required by law or to protect the rights and safety of our users and company.
            </p>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">4. Payment information</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Payment processing is handled by third-party providers (Paystack, Flutterwave, NOWPayments). We do not store full credit card numbers or bank credentials on our servers. All payment data is processed in compliance with PCI-DSS standards through our payment partners.
            </p>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">5. Data security</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encrypted connections (TLS/SSL), row-level security in our database, and access controls to protect your information. While no system is completely secure, we take reasonable steps to safeguard your data.
            </p>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">6. Cookies and tracking</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and preferences. We may use analytics tools to understand platform usage. You can control cookie preferences through your browser settings.
            </p>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">7. Your rights</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal information at any time through your dashboard settings. You may also request a copy of your data or ask us to restrict certain processing activities by contacting our support team.
            </p>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">8. Data retention</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. Transaction records are retained as required by applicable financial regulations. When you delete your account, personal data is removed within 30 days, except where retention is legally required.
            </p>
          </div>

          <div className="px-4 md:px-8">
            <h2 className="font-serif text-xl font-semibold border-b border-border pb-3">9. Changes to this policy</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. Material changes will be communicated via email or a notification on the platform. Continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </div>

          <div className="rounded-xl bg-secondary/40 p-8 mt-12 text-center">
            <h2 className="font-serif text-2xl font-semibold">10. Contact</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              For privacy-related questions, data requests, or concerns, contact us at
            </p>
            <div className="mt-4">
              <a href={`mailto:${brand.support_email}`} className="inline-flex items-center text-lg font-medium text-primary hover:underline transition-all">
                {brand.support_email}
              </a>
            </div>
          </div>

        </div>
      </section>
    </SiteLayout>
  );
}
