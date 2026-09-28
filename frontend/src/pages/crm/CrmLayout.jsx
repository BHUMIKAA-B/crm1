import React, { useState } from "react";
import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import ScreenshotGuard from "../../components/ScreenshotGuard";
import { useCrmTheme } from "../../hooks/useCrmTheme";
import {
  LayoutDashboard, Users, Building2, CalendarCheck, FileText,
  Settings, LogOut, Search, Bell, ChevronDown, Menu, X,
  TrendingUp, Handshake, UserCheck, BarChart3, ClipboardList,
  Shield, Building, Clock, Share2, MessageSquare, FolderGit2,
  CreditCard, DollarSign, ShieldAlert, GraduationCap, Sun, Moon
} from "lucide-react";
import { roleLabel, roleBadgeClass } from "../../lib/crmPermissions";

const NAV = [
  { name: "Dashboard", to: "/crm/dashboard", icon: LayoutDashboard, roles: null },
  { name: "Leads", to: "/crm/leads", icon: Users, roles: null },
  { name: "Customers", to: "/crm/customers", icon: UserCheck, roles: ["bdo", "founder", "admin"] },
  { name: "Requirements", to: "/crm/requirements", icon: FileText, roles: ["bdo", "founder", "admin"] },
  { name: "Teams", to: "/crm/teams", icon: Users, roles: ["team_lead", "bdo", "founder", "admin"] },
  { name: "Properties", to: "/crm/properties", icon: Building2, roles: null },
  { name: "Owners", to: "/crm/owners", icon: Shield, roles: ["team_lead", "bdo", "founder", "admin"] },
  { name: "Brokers", to: "/crm/brokers", icon: Building, roles: ["bdo", "founder", "admin"] },
  { name: "Tasks", to: "/crm/tasks", icon: CalendarCheck, roles: null },
  { name: "Follow-ups", to: "/crm/followups", icon: Clock, roles: null },
  { name: "Site Visits", to: "/crm/site-visits", icon: ClipboardList, roles: null },
  { name: "Property Shares", to: "/crm/property-shares", icon: Share2, roles: null },
  { name: "Negotiations", to: "/crm/negotiations", icon: MessageSquare, roles: null },
  { name: "Deals", to: "/crm/deals", icon: Handshake, roles: ["executive", "team_lead", "bdo", "founder", "admin"] },
  { name: "Documents", to: "/crm/documents", icon: FolderGit2, roles: null },
  { name: "Payments", to: "/crm/payments", icon: CreditCard, roles: ["team_lead", "bdo", "founder", "admin"] },
  { name: "Commissions", to: "/crm/commissions", icon: DollarSign, roles: ["executive", "team_lead", "bdo", "founder", "admin"] },
  { name: "Reports", to: "/crm/reports", icon: BarChart3, roles: ["executive", "team_lead", "bdo", "founder", "admin"] },
  { name: "Employees", to: "/crm/employees", icon: TrendingUp, roles: ["team_lead", "bdo", "founder", "admin"] },
  { name: "Learning", to: "/crm/learning", icon: GraduationCap, roles: null },
  { name: "Audit Logs", to: "/crm/audit-logs", icon: ShieldAlert, roles: ["team_lead", "bdo", "dpo", "founder", "admin"] },
  { name: "Settings", to: "/crm/settings", icon: Settings, roles: ["founder", "admin"] },
];



export default function CrmLayout() {
  const { isAuthenticated, employee, logout } = useCrmAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { crmTheme, toggleCrmTheme } = useCrmTheme();

  if (!isAuthenticated()) {
    return <Navigate to="/crm/login" replace />;
  }

  const role = employee?.role;
  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(role));
  const isDark = crmTheme === "dark";

  const handleLogout = () => {
    logout();
    navigate("/crm/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/crm/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const Sidebar = ({ mobile = false }) => (
    <aside className={`crm-sidebar flex flex-col ${mobile ? "w-full" : "w-64 min-h-screen"}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 crm-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">VS</span>
          </div>
          <span className="crm-sidebar-logo font-semibold tracking-wide">Visit Sarva CRM</span>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="crm-sidebar-muted hover:crm-sidebar-text">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "crm-nav-inactive"
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="p-3 crm-sidebar-border-top">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg crm-user-card">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {employee?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="crm-sidebar-logo text-sm font-medium truncate">{employee?.name}</p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${roleBadgeClass(role)}`}>
              {roleLabel(role)}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg crm-sidebar-muted crm-logout-btn text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`crm-root flex h-screen overflow-hidden`} data-crm-theme={crmTheme}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-72">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="crm-header flex-shrink-0 h-16 flex items-center gap-4 px-4 lg:px-6">
          <button
            className="lg:hidden crm-header-muted crm-header-icon-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 crm-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, customers, properties..."
                className="crm-search-input w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <button
              id="btn-crm-theme-toggle"
              onClick={toggleCrmTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="crm-theme-toggle p-2 rounded-lg transition-colors flex items-center gap-1.5"
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
              <span className="hidden sm:block text-xs font-medium crm-theme-label">
                {isDark ? "Light" : "Dark"}
              </span>
            </button>

            {/* Notifications */}
            <button className="relative p-2 crm-header-muted crm-header-icon-btn rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Employee pill */}
            <div className="hidden sm:flex items-center gap-2 pl-3 crm-header-divider">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs">
                {employee?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium crm-header-text leading-none">{employee?.name}</p>
                <p className="text-xs crm-header-muted mt-0.5">{roleLabel(role)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="crm-main flex-1 overflow-y-auto p-4 lg:p-6">
          <ScreenshotGuard>
            <Outlet />
          </ScreenshotGuard>
        </main>
      </div>
    </div>
  );
}
