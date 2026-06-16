import { Link } from "react-router-dom";
import { Building2, Mail, Phone, MapPin } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";

export function Footer() {
  const { brand } = useBrand();
  
  return (
    <footer className="border-t border-border bg-foreground text-primary-foreground">
      <div className="container-wide grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link to="/" className="flex items-center gap-2.5 font-serif text-lg font-semibold text-white">
            <img src={brand.logo_url || "/logo.png"} alt={brand.platform_name} className="h-10 w-auto" />
          </Link>
          <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
            {"A trusted, agency-led real estate platform. Every property is hand-curated and verified by our professional team."}
          </p>
        </div>

        {/* Browse */}
        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-5">{"Browse"}</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/properties?type=buy" className="text-white/60 hover:text-white transition-colors">{"For sale"}</Link></li>
            <li><Link to="/properties?type=rent" className="text-white/60 hover:text-white transition-colors">{"For rent"}</Link></li>
            <li><Link to="/properties?type=land" className="text-white/60 hover:text-white transition-colors">{"Land"}</Link></li>
            <li><Link to="/invest" className="text-white/60 hover:text-white transition-colors">{"Invest"}</Link></li>
            <li><Link to="/agents" className="text-white/60 hover:text-white transition-colors">{"Agents"}</Link></li>
            <li><Link to="/blog" className="text-white/60 hover:text-white transition-colors">{"Blog"}</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-5">{"Company"}</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/about" className="text-white/60 hover:text-white transition-colors">{"About"}</Link></li>
            <li><Link to="/careers" className="text-white/60 hover:text-white transition-colors">{"Careers"}</Link></li>
            <li><Link to="/press" className="text-white/60 hover:text-white transition-colors">{"Press"}</Link></li>
            <li><Link to="/privacy" className="text-white/60 hover:text-white transition-colors">{"Privacy policy"}</Link></li>
            <li><Link to="/terms" className="text-white/60 hover:text-white transition-colors">{"Terms of service"}</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-5">{"Contact"}</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>+234 801 234 5678</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>{brand.support_email}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="container-wide flex flex-col sm:flex-row items-center justify-between gap-3 py-5">
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} {brand.legal_name || brand.platform_name}. {"All listings curated and verified by our agency."}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/35">
            <Link to="/privacy" className="hover:text-white/60 transition-colors">{"Privacy"}</Link>
            <Link to="/terms" className="hover:text-white/60 transition-colors">{"Terms"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
