import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import crmApi from "../../api/crmClient";
import { canSeeFinancials, formatCurrency, roleLabel } from "../../lib/crmPermissions";
import {
  Users, TrendingUp, CalendarCheck, Building2,
  Handshake, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  ArrowUpRight,
} from "lucide-react";

function StatCard({ title, value, icon: Icon, color = "blue", sub, link }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  const card = (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{value ?? "—"}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {link && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <Link to={link} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );

  return card;
}

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-gray-700 mb-3">{children}</h2>;
}

export default function CrmDashboard() {
  const { employee } = useCrmAuthStore();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const role = employee?.role;

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/reports/dashboard-summary");
      setSummary(res.data);
      setLastUpdated(new Date());
    } catch {
      // Keep previous data if fetch fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {employee?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {roleLabel(role)} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Priority Alerts */}
      {summary && (summary.overdue_tasks > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            You have <strong>{summary.overdue_tasks}</strong> overdue task{summary.overdue_tasks !== 1 ? "s" : ""}.{" "}
            <Link to="/crm/tasks?filter=overdue" className="underline">View now →</Link>
          </p>
        </div>
      )}

      {/* Core Stats Grid */}
      <div>
        <SectionTitle>Pipeline Overview</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Leads"
            value={summary?.total_leads}
            icon={Users}
            color="blue"
            link="/crm/leads"
          />
          <StatCard
            title="Active Leads"
            value={summary?.active_leads}
            icon={TrendingUp}
            color="indigo"
            link="/crm/leads"
          />
          <StatCard
            title="New Today"
            value={summary?.new_leads_today}
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Office Visits Today"
            value={summary?.site_visits_today}
            icon={Building2}
            color="green"
            link="/crm/site-visits"
          />
        </div>
      </div>

      {/* Task summary */}
      <div>
        <SectionTitle>Today's Workload</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Overdue Tasks"
            value={summary?.overdue_tasks}
            icon={AlertTriangle}
            color="red"
            link="/crm/tasks?filter=overdue"
          />
          <StatCard
            title="Due Today"
            value={summary?.due_today}
            icon={Clock}
            color="amber"
            link="/crm/tasks?filter=today"
          />
          <StatCard
            title="Office Visits Today"
            value={summary?.site_visits_today}
            icon={CalendarCheck}
            color="green"
            link="/crm/site-visits"
          />
        </div>
      </div>

      {/* Founder-only financial section */}
      {canSeeFinancials(role) && summary && (
        <div>
          <SectionTitle>Business Intelligence</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Properties"
              value={summary.total_properties}
              icon={Building2}
              color="blue"
              link="/crm/properties"
            />
            <StatCard
              title="Active Employees"
              value={summary.total_employees}
              icon={Users}
              color="indigo"
              link="/crm/employees"
            />
            <StatCard
              title="Total Deals"
              value={summary.total_deals}
              icon={Handshake}
              color="purple"
              link="/crm/deals"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(summary.total_revenue)}
              icon={TrendingUp}
              color="green"
              sub={`₹${((summary.total_revenue || 0) / 1e7).toFixed(1)} Cr`}
            />
          </div>

          {summary.pending_commission > 0 && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Pending commission: <strong>{formatCurrency(summary.pending_commission)}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-gray-400 text-right">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
