import { Link } from "react-router-dom";
import { Building2, Mail, Phone, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-foreground text-primary-foreground">
      <div className="container-wide grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link to="/" className="flex items-center gap-2.5 font-serif text-lg font-semibold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            Verdant Estate
          </Link>
          <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
            {t('footer.brandDesc', 'A trusted, agency-led real estate platform. Every property is hand-curated and verified by our professional team.')}
          </p>
        </div>

        {/* Browse */}
        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-5">{t('footer.browse', 'Browse')}</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/properties?type=buy" className="text-white/60 hover:text-white transition-colors">{t('footer.forSale', 'For sale')}</Link></li>
            <li><Link to="/properties?type=rent" className="text-white/60 hover:text-white transition-colors">{t('footer.forRent', 'For rent')}</Link></li>
            <li><Link to="/properties?type=land" className="text-white/60 hover:text-white transition-colors">{t('footer.land', 'Land')}</Link></li>
            <li><Link to="/invest" className="text-white/60 hover:text-white transition-colors">{t('footer.invest', 'Invest')}</Link></li>
            <li><Link to="/agents" className="text-white/60 hover:text-white transition-colors">{t('footer.agents', 'Agents')}</Link></li>
            <li><Link to="/blog" className="text-white/60 hover:text-white transition-colors">{t('footer.blog', 'Blog')}</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-5">{t('footer.company', 'Company')}</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/about" className="text-white/60 hover:text-white transition-colors">{t('footer.about', 'About')}</Link></li>
            <li><Link to="/careers" className="text-white/60 hover:text-white transition-colors">{t('footer.careers', 'Careers')}</Link></li>
            <li><Link to="/press" className="text-white/60 hover:text-white transition-colors">{t('footer.press', 'Press')}</Link></li>
            <li><Link to="/privacy" className="text-white/60 hover:text-white transition-colors">{t('footer.privacyPolicy', 'Privacy policy')}</Link></li>
            <li><Link to="/terms" className="text-white/60 hover:text-white transition-colors">{t('footer.termsOfService', 'Terms of service')}</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-5">{t('footer.contact', 'Contact')}</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>+234 801 234 5678</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>hello@verdantestate.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="container-wide flex flex-col sm:flex-row items-center justify-between gap-3 py-5">
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} Verdant Estate. {t('footer.copyrightText', 'All listings curated and verified by our agency.')}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/35">
            <Link to="/privacy" className="hover:text-white/60 transition-colors">{t('footer.privacy', 'Privacy')}</Link>
            <Link to="/terms" className="hover:text-white/60 transition-colors">{t('footer.terms', 'Terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}