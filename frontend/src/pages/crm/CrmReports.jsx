import React, { useEffect, useState, useCallback } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import { canSeeFinancials, canManageEmployees, roleLabel, roleBadgeClass, formatCurrency } from "../../lib/crmPermissions";
import toast from "react-hot-toast";
import { BarChart3, TrendingUp, Users, RefreshCw, Medal, ArrowUpRight, AlertTriangle } from "lucide-react";

function SourceChart({ data }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-6">No data</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.source} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-28 truncate">{d.source}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-6 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function FunnelChart({ data }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-6">No data</p>;
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const statusColors = {
    new: "#3b82f6", contacted: "#f59e0b", qualified: "#8b5cf6",
    closed_won: "#10b981", closed_lost: "#ef4444",
  };
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map(d => (
        <div key={d.status} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-36 truncate">{d.status?.replace(/_/g, " ")}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 rounded-full" style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: statusColors[d.status] || "#94a3b8",
            }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-6 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function CrmReports() {
  const { employee } = useCrmAuthStore();
  const role = employee?.role;
  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [srcRes, stRes] = await Promise.all([
        crmApi.get("/reports/lead-sources"),
        crmApi.get("/reports/lead-statuses"),
      ]);
      setSources(srcRes.data);
      setStatuses(stRes.data);

      if (["founder", "admin", "team_lead"].includes(role)) {
        const perfRes = await crmApi.get("/reports/employee-performance");
        setPerformance(perfRes.data);
      }
    } catch { toast.error("Failed to load reports"); }
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Real-time data from your CRM</p>
        </div>
        <button onClick={fetch} disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" /> Leads by Source
          </h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-2 bg-gray-100 rounded w-24" />
                <div className="h-2 bg-gray-100 rounded flex-1" />
              </div>
            ))}</div>
          ) : <SourceChart data={sources} />}
        </div>

        {/* Lead Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Lead Status Funnel
          </h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-2 bg-gray-100 rounded w-32" />
                <div className="h-2 bg-gray-100 rounded flex-1" />
              </div>
            ))}</div>
          ) : <FunnelChart data={statuses} />}
        </div>
      </div>

      {/* Employee Performance Table */}
      {["founder", "admin", "team_lead"].includes(role) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" /> Employee Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/70">
                <tr>
                  {["#", "Employee", "Role", "Leads", "Won", "Conversion", "Tasks Done", "Visits"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : performance.map((emp, idx) => (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-3">
                        {idx === 0 ? <Medal className="w-4 h-4 text-amber-500" /> : <span className="text-sm text-gray-400">{idx + 1}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {emp.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass(emp.role)}`}>
                          {roleLabel(emp.role)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900">{emp.leads}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-emerald-600">{emp.closed_won}</td>
                      <td className="px-3 py-3">
                        <span className={`text-sm font-bold ${emp.conversion_rate >= 30 ? "text-emerald-600" : emp.conversion_rate >= 15 ? "text-amber-600" : "text-red-500"}`}>
                          {emp.conversion_rate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{emp.completed_tasks}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{emp.site_visits}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
