import { Link } from "react-router-dom";
import { Home, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="container-wide grid gap-10 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-serif text-xl font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm text-primary-foreground">
              <Home className="h-4 w-4" />
            </span>
            Warm Estate
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            A trusted, agency-led real estate platform — every property hand-curated by our team.
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-serif text-sm font-semibold">Browse</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/properties?type=buy" className="hover:text-primary">For sale</Link></li>
            <li><Link to="/properties?type=rent" className="hover:text-primary">For rent</Link></li>
            <li><Link to="/properties?type=land" className="hover:text-primary">Land</Link></li>
            <li><Link to="/agents" className="hover:text-primary">Agents</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-serif text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>About</li>
            <li>Careers</li>
            <li>Press</li>
            <li>Privacy</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-serif text-sm font-semibold">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 555 010 0000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@warmestate.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5">
        <p className="container-wide text-xs text-muted-foreground">
          © {new Date().getFullYear()} Warm Estate. All listings curated by our agency.
        </p>
      </div>
    </footer>
  );
}