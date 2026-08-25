import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, Bookmark, Inbox, ChevronDown, MessageCircle, Building2 } from "lucide-react";
import Logo from "@/components/Logo";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { PROPERTY_CATEGORIES } from "@/utils/format";

const SECTOR_LINKS = [
  ...PROPERTY_CATEGORIES.map((c) => ({
    label: c.label,
    to: c.value === "construction_interior" ? "/construction" : `/properties?category=${c.value}`,
  })),
  { label: "All-in-One Documents", to: "/services" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [sectorsOpen, setSectorsOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sectorRef = useRef(null);
  const userRef = useRef(null);
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuthStore();
  const isAuthed = !!accessToken && !!user;

  useEffect(() => {
    const handleClick = (e) => {
      if (sectorRef.current && !sectorRef.current.contains(e.target)) setSectorsOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setMenu(false);
    };
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setMenu(false);
    navigate("/");
  };

  const dashboardPath =
    user?.role === "seller"
      ? "/seller/dashboard"
      : user?.role === "admin"
      ? "/admin/dashboard"
      : "/home";

  return (
    <header
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-vs-bg/95 backdrop-blur-2xl border-b border-vs-border shadow-premium-sm"
          : "bg-vs-bg/70 backdrop-blur-md"
      }`}
    >
      <div className="max-w-[80rem] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group" data-testid="navbar-logo">
          <Logo size={36} color="#C89B5F" />
          <div className="leading-tight">
            <span className="font-display font-medium text-xl tracking-tight text-vs-text-primary group-hover:text-vs-gold transition-colors duration-300">
              VisitSarva
            </span>
            <div className="text-[10px] tracking-[0.2em] uppercase text-vs-text-secondary font-medium mt-0.5">
              Zero Brokerage
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-10 flex-1 justify-center">
          <div className="relative" ref={sectorRef}>
            <button
              data-testid="nav-sectors-btn"
              onClick={() => setSectorsOpen((s) => !s)}
              className="flex items-center gap-1.5 text-sm font-medium text-vs-text-secondary hover:text-vs-gold transition-colors duration-300"
            >
              Sectors
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${sectorsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {sectorsOpen && (
              <div
                data-testid="nav-sectors-panel"
                className="absolute left-1/2 -translate-x-1/2 mt-4 w-[480px] bg-vs-surface border border-vs-border rounded-xl shadow-premium-lg overflow-hidden animate-fade-in-up"
              >
                <div className="p-1 grid grid-cols-2">
                  {SECTOR_LINKS.map((s, i) => (
                    <Link
                      key={s.label}
                      to={s.to}
                      data-testid={`nav-sector-${s.label.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}
                      onClick={() => setSectorsOpen(false)}
                      className="px-4 py-3 text-sm text-vs-text-secondary hover:text-vs-text-primary hover:bg-vs-bg transition-all duration-200 flex items-center justify-between group"
                    >
                      <span>{s.label}</span>
                      <span className="text-vs-gold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <NavLink to="/properties">Browse</NavLink>
          <NavLink to="/construction">Construction</NavLink>
          <NavLink to="/services">Documents</NavLink>
          <NavLink to="/chat">
            <MessageCircle size={16} className="text-vs-gold" />
            <span>Assistant</span>
          </NavLink>
        </nav>

        {/* Right section */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {!isAuthed ? (
            <>
              <ThemeToggle />
              {/* CRM Button — unauthenticated desktop */}
              <Link
                to="/crm-access"
                data-testid="nav-crm-btn"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <Building2 size={14} />
                CRM Portal
              </Link>
              <Link
                to="/login"
                data-testid="nav-login"
                className="text-sm font-medium text-vs-text-secondary hover:text-vs-gold transition-colors duration-300"
              >
                Login
              </Link>
              <Link
                to="/register"
                data-testid="nav-signup"
                className="btn-primary"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <ThemeToggle />
              <NotificationsDropdown />
              {/* CRM Button — authenticated desktop */}
              <Link
                to="/crm-access"
                data-testid="nav-crm-btn-authed"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <Building2 size={14} />
                CRM Portal
              </Link>
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setMenu((s) => !s)}
                  data-testid="user-menu-toggle"
                  className="flex items-center gap-3 px-3 py-2 border border-vs-border hover:border-vs-gold hover:shadow-premium-sm rounded-xl transition-all duration-300 group"
                >
                  <div className="w-8 h-8 rounded-full bg-vs-gold text-[#FFFFFF] text-xs font-semibold flex items-center justify-center">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-sm text-vs-text-primary group-hover:text-vs-gold transition-colors">
                    {user.name?.split(" ")[0]}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-vs-text-secondary transition-transform duration-200 ${menu ? "rotate-180" : ""}`}
                  />
                </button>
                {menu && (
                  <div
                    data-testid="user-menu"
                    className="absolute right-0 mt-2 w-60 bg-vs-surface border border-vs-border rounded-xl shadow-premium-lg overflow-hidden animate-fade-in-up"
                  >
                    <Link
                      to={dashboardPath}
                      onClick={() => setMenu(false)}
                      data-testid="menu-dashboard"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-vs-text-secondary hover:text-vs-text-primary hover:bg-vs-bg transition-all duration-200"
                    >
                      <LayoutDashboard size={16} className="text-vs-gold" />
                      Dashboard
                    </Link>
                    {user.role === "buyer" && (
                      <>
                        <Link
                          to="/saved"
                          onClick={() => setMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-vs-text-secondary hover:text-vs-text-primary hover:bg-vs-bg transition-all duration-200"
                        >
                          <Bookmark size={16} className="text-vs-gold" /> Saved
                        </Link>
                        <Link
                          to="/enquiries"
                          onClick={() => setMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-vs-text-secondary hover:text-vs-text-primary hover:bg-vs-bg transition-all duration-200"
                        >
                          <Inbox size={16} className="text-vs-gold" /> My Enquiries
                        </Link>
                      </>
                    )}
                    <div className="px-4 py-2.5 text-[10px] uppercase tracking-[0.15em] text-vs-text-muted border-t border-vs-border bg-vs-bg">
                      {user.role} · {user.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      data-testid="menu-logout"
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-[#DC2626] hover:bg-vs-bg border-t border-vs-border transition-all duration-200"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-vs-text-primary hover:text-vs-gold transition-colors"
          onClick={() => setOpen((s) => !s)}
          data-testid="nav-mobile-toggle"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-vs-bg border-t border-vs-border">
          <div className="px-6 py-6 space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-vs-text-muted mb-3">
              Sectors
            </div>
            {SECTOR_LINKS.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                onClick={() => setOpen(false)}
                className="block py-2.5 text-sm text-vs-text-secondary hover:text-vs-gold transition-colors"
              >
                {s.label}
              </Link>
            ))}
            <div className="border-t border-vs-border my-4" />
            <NavLink to="/properties" onClick={() => setOpen(false)}>Browse all</NavLink>
            <NavLink to="/construction" onClick={() => setOpen(false)}>Construction</NavLink>
            <NavLink to="/services" onClick={() => setOpen(false)}>Documents</NavLink>
            <NavLink to="/chat" onClick={() => setOpen(false)}>
              <MessageCircle size={16} className="text-vs-gold" />
              <span>AI Assistant</span>
            </NavLink>
            <div className="border-t border-vs-border my-4" />
            {/* CRM Button — mobile menu */}
            <Link
              to="/crm-access"
              data-testid="nav-crm-btn-mobile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 py-2.5 text-sm font-semibold text-vs-text-secondary hover:text-vs-gold transition-colors"
            >
              <Building2 size={15} className="text-vs-gold" />
              CRM
            </Link>
            <div className="border-t border-vs-border my-4" />
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-vs-text-secondary">Appearance</span>
              <ThemeToggle />
            </div>
            <div className="border-t border-vs-border my-4" />
            {!isAuthed ? (
              <div className="space-y-3 pt-2">
                <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary justify-center w-full">
                  Login
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary justify-center w-full">
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <Link
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                  className="btn-secondary justify-center w-full"
                >
                  <LayoutDashboard size={16} className="text-vs-gold" />
                  {user.name}
                </Link>
                <button onClick={handleLogout} className="btn-secondary justify-center w-full text-[#DC2626] hover:text-[#DC2626] hover:border-[#DC2626]">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const NavLink = ({ to, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-2 text-sm font-medium text-vs-text-secondary hover:text-vs-gold transition-colors duration-300"
  >
    {children}
  </Link>
);

export default Navbar;
