import React, { useState } from "react";
import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import {
  LayoutDashboard, Users, Building2, CalendarCheck, FileText,
  Settings, LogOut, Search, Bell, ChevronDown, Menu, X,
  TrendingUp, Handshake, UserCheck, BarChart3, ClipboardList,
  Shield, Building, Clock, Share2, MessageSquare, FolderGit2,
  CreditCard, DollarSign, ShieldAlert
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
  { name: "Office Visits", to: "/crm/site-visits", icon: ClipboardList, roles: null },
  { name: "Property Shares", to: "/crm/property-shares", icon: Share2, roles: null },
  { name: "Negotiations", to: "/crm/negotiations", icon: MessageSquare, roles: null },
  { name: "Deals", to: "/crm/deals", icon: Handshake, roles: ["executive", "team_lead", "bdo", "founder", "admin"] },
  { name: "Documents", to: "/crm/documents", icon: FolderGit2, roles: null },
  { name: "Payments", to: "/crm/payments", icon: CreditCard, roles: ["team_lead", "bdo", "founder", "admin"] },
  { name: "Commissions", to: "/crm/commissions", icon: DollarSign, roles: ["executive", "team_lead", "bdo", "founder", "admin"] },
  { name: "Reports", to: "/crm/reports", icon: BarChart3, roles: ["executive", "team_lead", "bdo", "founder", "admin"] },
  { name: "Employees", to: "/crm/employees", icon: TrendingUp, roles: ["team_lead", "bdo", "founder", "admin"] },
  { name: "Audit Logs", to: "/crm/audit-logs", icon: ShieldAlert, roles: ["team_lead", "bdo", "dpo", "founder", "admin"] },
  { name: "Settings", to: "/crm/settings", icon: Settings, roles: ["founder", "admin"] },
];



export default function CrmLayout() {
  const { isAuthenticated, employee, logout } = useCrmAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isAuthenticated()) {
    return <Navigate to="/crm/login" replace />;
  }

  const role = employee?.role;
  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(role));

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
    <aside className={`flex flex-col bg-slate-900 ${mobile ? "w-full" : "w-64 min-h-screen"}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">VS</span>
          </div>
          <span className="text-white font-semibold tracking-wide">Visit Sarva CRM</span>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
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
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {employee?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{employee?.name}</p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${roleBadgeClass(role)}`}>
              {roleLabel(role)}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
        <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-6">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, customers, properties..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Employee pill */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs">
                {employee?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900 leading-none">{employee?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{roleLabel(role)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
