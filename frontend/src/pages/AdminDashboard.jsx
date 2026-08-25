import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCheck, Store, CheckSquare,
  FolderOpen, Building2, MapPin, MessageSquare, Bell,
  BarChart2, Settings, LogOut, Menu, X, ChevronRight,
  XCircle, BookOpen,
} from "lucide-react";
import DashboardHome              from "./admin/DashboardHome";
import AdminUsers                 from "./admin/AdminUsers";
import AdminApprovals             from "./admin/AdminApprovals";
import AdminProjects              from "./admin/AdminProjects";
import AdminProperties            from "./admin/AdminProperties";
import AdminEnquiries             from "./admin/AdminEnquiries";
import AdminNotifications         from "./admin/AdminNotifications";
import AdminReports               from "./admin/AdminReports";
import AdminSettings              from "./admin/AdminSettings";
import AdminRejectedProperties    from "./admin/AdminRejectedProperties";
import AdminBrochureDownloads     from "./admin/AdminBrochureDownloads";
import api from "@/api/client";

const NAV = [
  { id: "dashboard",     label: "Dashboard",          icon: LayoutDashboard },
  { type: "divider",     label: "USERS" },
  { id: "users",         label: "All Users",           icon: Users },
  { id: "buyers",        label: "Buyers",              icon: UserCheck },
  { id: "sellers",       label: "Sellers",             icon: Store },
  { type: "divider",     label: "PROPERTIES" },
  { id: "approvals",     label: "Property Approval",   icon: CheckSquare,  badge: "pending" },
  { id: "projects",      label: "Projects",            icon: FolderOpen },
  { id: "properties",    label: "Properties",          icon: Building2 },
  { id: "sites",         label: "Sites",               icon: MapPin },
  { id: "rejected",      label: "Rejected Properties", icon: XCircle },
  { type: "divider",     label: "OPERATIONS" },
  { id: "enquiries",     label: "Enquiries",           icon: MessageSquare },
  { id: "brochures",     label: "Brochure Downloads",  icon: BookOpen },
  { id: "notifications", label: "Notifications",       icon: Bell,         badge: "notif" },
  { id: "reports",       label: "Reports",             icon: BarChart2 },
  { id: "settings",      label: "Settings",            icon: Settings },
];

const TITLES = {
  dashboard: "Dashboard",  users: "All Users",         buyers: "Buyers",
  sellers: "Sellers",      approvals: "Property Approval", projects: "Projects",
  properties: "Properties", sites: "Sites",            enquiries: "Enquiries",
  rejected: "Rejected Properties", brochures: "Brochure Downloads",
  notifications: "Notifications", reports: "Reports",  settings: "Settings",
};

export default function AdminDashboard() {
  const [section, setSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  const refreshStats = () =>
    api.get("/admin/dashboard/stats").then(({ data }) => setStats(data)).catch(() => {});

  useEffect(() => { refreshStats(); }, []);

  const logout = () => {
    localStorage.removeItem("vs_token");
    localStorage.removeItem("vs_user");
    navigate("/login");
  };

  const nav = (id) => { setSection(id); setSidebarOpen(false); };

  return (
    <div className="flex h-screen bg-vs-bg overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-vs-card border-r border-vs-border
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-vs-border shrink-0">
          <div>
            <div className="font-display font-bold text-vs-text-primary text-lg leading-tight">
              VisitSarva
            </div>
            <div className="text-[10px] text-vs-gold font-semibold tracking-widest uppercase">
              Admin Console
            </div>
          </div>
          <button
            className="lg:hidden text-vs-text-secondary hover:text-vs-text-primary"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV.map((item, i) => {
            if (item.type === "divider") {
              return (
                <div key={`div-${i}`} className="px-2 pt-5 pb-1.5">
                  <span className="text-[10px] font-semibold tracking-widest text-vs-text-secondary uppercase">
                    {item.label}
                  </span>
                </div>
              );
            }
            const Icon   = item.icon;
            const active = section === item.id;
            const badge  =
              item.badge === "pending" ? stats?.pending_listings :
              item.badge === "notif"   ? stats?.unread_notifications : null;

            return (
              <button
                key={item.id}
                onClick={() => nav(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${active
                    ? "bg-vs-gold/10 text-vs-gold font-medium"
                    : "text-vs-text-secondary hover:bg-vs-bg hover:text-vs-text-primary"
                  }
                `}
              >
                <Icon size={16} className={active ? "text-vs-gold shrink-0" : "shrink-0"} />
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span className="bg-vs-gold text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-vs-border shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-vs-text-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-vs-card border-b border-vs-border flex items-center gap-4 px-6 shrink-0">
          <button
            className="lg:hidden text-vs-text-secondary hover:text-vs-text-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm text-vs-text-secondary">
            <span className="font-medium text-vs-gold">Admin</span>
            <ChevronRight size={14} />
            <span className="text-vs-text-primary font-medium">{TITLES[section]}</span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1400px] mx-auto">
            {section === "dashboard"     && <DashboardHome stats={stats} onRefresh={refreshStats} />}
            {section === "users"         && <AdminUsers role="all" />}
            {section === "buyers"        && <AdminUsers role="buyer" />}
            {section === "sellers"       && <AdminUsers role="seller" />}
            {section === "approvals"     && <AdminApprovals onAction={refreshStats} />}
            {section === "projects"      && <AdminProjects />}
            {section === "properties"    && <AdminProperties />}
            {section === "sites"         && <AdminProperties categoryFilter="plot" title="Sites" />}
            {section === "enquiries"     && <AdminEnquiries />}
            {section === "rejected"      && <AdminRejectedProperties onAction={refreshStats} />}
            {section === "brochures"     && <AdminBrochureDownloads />}
            {section === "notifications" && <AdminNotifications onRead={refreshStats} />}
            {section === "reports"       && <AdminReports />}
            {section === "settings"      && <AdminSettings />}
          </div>
        </main>
      </div>
    </div>
  );
}
