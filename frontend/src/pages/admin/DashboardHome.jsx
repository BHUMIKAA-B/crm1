import React, { useEffect, useState } from "react";
import {
  Users, Building2, Clock, CheckCircle, XCircle,
  MessageSquare, FolderOpen, Bell, TrendingUp, UserCheck, Store, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "@/api/client";

const PIE_COLORS  = ["#10B981", "#F59E0B", "#EF4444"];
const CHART_COLORS = { users: "#78AFCF", properties: "#10B981", enquiries: "#F59E0B" };

export default function DashboardHome({ stats, onRefresh }) {
  const [charts, setCharts]     = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get("/admin/dashboard/charts")
      .then(({ data }) => setCharts(data))
      .finally(() => setLoading(false));
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="rounded-xl h-24 bg-vs-card animate-pulse border border-vs-border" />
        ))}
      </div>
    );
  }

  const total = (stats.published_listings || 0) + (stats.pending_listings || 0) + (stats.rejected_listings || 0);

  const statCards = [
    { label: "Total Users",       value: stats.users_total,       icon: Users,          gradient: "from-blue-500 to-blue-700" },
    { label: "Buyers",            value: stats.buyers,            icon: UserCheck,       gradient: "from-violet-500 to-violet-700" },
    { label: "Sellers",           value: stats.sellers,           icon: Store,           gradient: "from-indigo-500 to-indigo-700" },
    { label: "Total Properties",  value: total,                   icon: Building2,       gradient: "from-emerald-500 to-emerald-700" },
    { label: "Pending Approval",  value: stats.pending_listings,  icon: Clock,           gradient: "from-amber-500 to-amber-700" },
    { label: "Approved",          value: stats.published_listings,icon: CheckCircle,     gradient: "from-teal-500 to-teal-700" },
    { label: "Rejected",          value: stats.rejected_listings, icon: XCircle,         gradient: "from-rose-500 to-rose-700" },
    { label: "Today's Enquiries", value: stats.today_enquiries,   icon: MessageSquare,   gradient: "from-orange-500 to-orange-700" },
    { label: "Total Enquiries",   value: stats.enquiries,         icon: MessageSquare,   gradient: "from-cyan-500 to-cyan-700" },
    { label: "Projects",          value: stats.projects,          icon: FolderOpen,      gradient: "from-purple-500 to-purple-700" },
    { label: "Notifications",     value: stats.unread_notifications, icon: Bell,         gradient: "from-pink-500 to-pink-700" },
  ];

  const pieData = [
    { name: "Approved", value: stats.published_listings || 0 },
    { name: "Pending",  value: stats.pending_listings  || 0 },
    { name: "Rejected", value: stats.rejected_listings || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-vs-text-primary text-2xl">Dashboard Overview</h1>
          <p className="text-vs-text-secondary text-sm mt-0.5">Real-time analytics and activity.</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 text-sm text-vs-text-secondary hover:text-vs-gold transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className={`rounded-xl p-4 bg-gradient-to-br ${gradient} shadow-sm`}>
            <Icon size={18} className="text-white/70" />
            <div className="text-3xl font-bold font-display text-white mt-2 leading-none">{value ?? 0}</div>
            <div className="text-xs font-medium mt-1.5 text-white/80">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {!loading && charts && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Monthly Trend */}
          <div className="lg:col-span-2 card p-5">
            <h3 className="font-display font-semibold text-vs-text-primary mb-1 flex items-center gap-2 text-sm">
              <TrendingUp size={15} className="text-vs-gold" /> Monthly Trends (Last 6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.monthly} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  {Object.entries(CHART_COLORS).map(([key, color]) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={color} stopOpacity={0}    />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid rgba(128,128,128,0.2)", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="users"      stroke={CHART_COLORS.users}      fill={`url(#grad-users)`}      strokeWidth={2} name="Users" />
                <Area type="monotone" dataKey="properties" stroke={CHART_COLORS.properties} fill={`url(#grad-properties)`} strokeWidth={2} name="Properties" />
                <Area type="monotone" dataKey="enquiries"  stroke={CHART_COLORS.enquiries}  fill="none"                    strokeWidth={2} name="Enquiries" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Property Status Pie */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-vs-text-primary mb-1 text-sm">Property Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Buyer vs Seller Bar */}
      {!loading && charts && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-5">
            <h3 className="font-display font-semibold text-vs-text-primary mb-1 text-sm">Buyer vs Seller</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={[{ name: "Buyers", count: stats.buyers }, { name: "Sellers", count: stats.sellers }]}
                margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#78AFCF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Users */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-vs-text-primary mb-3 text-sm">Latest Registrations</h3>
            <div className="space-y-3">
              {(stats.recent_users || []).map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-vs-gold/10 flex items-center justify-center text-vs-gold text-xs font-bold shrink-0">
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-vs-text-primary truncate">{u.name}</div>
                    <div className="text-xs text-vs-text-secondary">{u.role} · {new Date(u.created_at).toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
              ))}
              {!stats.recent_users?.length && <p className="text-vs-text-secondary text-xs">No users yet</p>}
            </div>
          </div>

          {/* Recent Enquiries */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-vs-text-primary mb-3 text-sm">Recent Enquiries</h3>
            <div className="space-y-3">
              {(stats.recent_enquiries || []).map(e => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <MessageSquare size={13} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-vs-text-primary truncate">{e.property_title || "Property"}</div>
                    <div className="text-xs text-vs-text-secondary truncate">{e.name} · {new Date(e.created_at).toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
              ))}
              {!stats.recent_enquiries?.length && <p className="text-vs-text-secondary text-xs">No enquiries yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
