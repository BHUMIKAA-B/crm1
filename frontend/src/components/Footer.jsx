import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { Drama as Instagram, Link as Linkedin, Notebook as Facebook, Battery as Twitter, Mail, Phone, MapPin, Newspaper, Heart } from "lucide-react";

const Footer = () => (
  <footer data-testid="footer" className="bg-vs-surface border-t border-vs-border">
    <div className="max-w-[80rem] mx-auto px-6 lg:px-12 py-16">
      <div className="grid md:grid-cols-12 gap-10 lg:gap-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <Logo size={36} color="#C89B5F" />
            <div>
              <div className="font-display font-medium text-xl text-vs-text-primary">VisitSarva</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-vs-gold mt-0.5">
                Zero Brokerage Property Platform
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-vs-text-secondary leading-relaxed max-w-sm">
            VisitSarva connects buyers directly with verified sellers across
            India — no brokers, no hidden fees, no middlemen.
          </p>
          <p className="mt-6 font-display text-2xl text-vs-gold">
            "Buy property, pay no brokerage."
          </p>
          <div className="mt-6 flex items-center gap-3">
            {[Instagram, Linkedin, Facebook, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-10 h-10 border border-vs-border hover:border-vs-gold hover:shadow-premium-sm text-vs-text-muted hover:text-vs-gold flex items-center justify-center rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                aria-label="social"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
        <FooterCol
          title="Explore"
          links={[
            { to: "/properties", label: "All Properties" },
            { to: "/properties?category=residential", label: "Residential" },
            { to: "/properties?category=commercial", label: "Commercial" },
            { to: "/loan-assistance", label: "Home Loan Assistance" },
            { to: "/services", label: "Document Services" },
          ]}
        />
        <FooterCol
          title="For You"
          links={[
            { to: "/register", label: "Sign Up" },
            { to: "/login", label: "Login" },
            { to: "/seller/listings/new", label: "List Property" },
            { to: "/services", label: "Request Service" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { to: "#", label: "About Us" },
            { to: "#", label: "Contact" },
            { to: "#", label: "Privacy Policy" },
            { to: "#", label: "Terms of Service" },
          ]}
        />
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 rounded-full border border-vs-gold/40 bg-vs-gold/10 px-5 py-3 text-sm font-semibold text-vs-gold transition-all duration-300 hover:-translate-y-0.5 hover:bg-vs-gold hover:text-vs-bg"
          data-testid="footer-blogs"
        >
          <Newspaper size={17} /> Blogs
        </Link>
        <Link
          to="/wishlist"
          className="inline-flex items-center gap-2 rounded-full border border-vs-primary/40 bg-vs-primary/10 px-5 py-3 text-sm font-semibold text-vs-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-vs-primary hover:text-vs-bg"
          data-testid="footer-wishlist"
        >
          <Heart size={17} /> Wishlist
        </Link>
      </div>
      <div className="mt-14 pt-8 border-t border-vs-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-vs-text-muted">
        <div>© {new Date().getFullYear()} VisitSarva. All rights reserved.</div>
        <div className="flex items-center gap-6">
          <span className="tracking-wider">India · Zero Brokerage Platform</span>
          <Link
            to="/crm-access"
            data-testid="footer-employee-access"
            className="text-vs-text-muted hover:text-vs-gold text-xs transition-colors duration-300 flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <span>Employee Access</span>
          </Link>
        </div>
      </div>

    </div>
  </footer>
);

const FooterCol = ({ title, links }) => (
  <div className="md:col-span-2">
    <div className="text-[10px] uppercase tracking-[0.2em] text-vs-gold mb-5 font-medium">
      {title}
    </div>
    <ul className="space-y-3">
      {links.map((l, i) => (
        <li key={i}>
          <Link
            to={l.to}
            className="text-sm text-vs-text-secondary hover:text-vs-gold transition-colors duration-300"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default Footer;
