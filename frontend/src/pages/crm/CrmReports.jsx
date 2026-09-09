import React, { useEffect, useState, useCallback } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import { roleLabel, roleBadgeClass } from "../../lib/crmPermissions";
import toast from "react-hot-toast";
import {
  BarChart3, TrendingUp, Users, RefreshCw, Medal,
  ArrowUpRight, Download, ChevronDown, Shield, Lock
} from "lucide-react";

// ── Chart helpers ──────────────────────────────────────────
function SourceChart({ data }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-6">No data</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.source} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-28 truncate">{d.source || "Unknown"}</span>
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

// ── Main Component ─────────────────────────────────────────
export default function CrmReports() {
  const { employee } = useCrmAuthStore();
  const role = employee?.role;

  // Role flags — used throughout
  const isFounderOrBdo = ["founder", "admin", "bdo"].includes(role);
  const isTeamLead = role === "team_lead";
  const canDownload = isFounderOrBdo || isTeamLead;

  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [teamDownloading, setTeamDownloading] = useState(false);

  // Team selector state (Founder / BDO individual team download)
  const [teamSelectorOpen, setTeamSelectorOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // ── Fetch analytics data ───────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [srcRes, stRes] = await Promise.all([
        crmApi.get("/reports/lead-sources"),
        crmApi.get("/reports/lead-statuses"),
      ]);
      setSources(srcRes.data);
      setStatuses(stRes.data);

      if (["founder", "admin", "bdo", "team_lead"].includes(role)) {
        const perfRes = await crmApi.get("/reports/employee-performance");
        setPerformance(perfRes.data);
      }

      // Fetch teams list for Founder / BDO individual download
      if (isFounderOrBdo) {
        const teamsRes = await crmApi.get("/reports/teams");
        setTeams(teamsRes.data);
      }
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [role, isFounderOrBdo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Download helpers ───────────────────────────────────
  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // All-scope download (Founder: all teams; BDO: BDO scope; Team Lead: own team)
  const handleDownloadAll = async () => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const response = await crmApi.get("/reports/export", { responseType: "blob" });
      const filename = isTeamLead
        ? `MyTeam_Report_${new Date().toISOString().slice(0, 10)}.csv`
        : `AllTeams_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      triggerDownload(response.data, filename);
      toast.success("Report downloaded successfully");
    } catch (err) {
      const msg = err.response?.status === 403
        ? "You are not authorised to download reports."
        : "Failed to download report";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  // Individual team download (Founder / BDO only)
  const handleDownloadTeam = async () => {
    if (!isFounderOrBdo || !selectedTeamId) {
      toast.error("Please select a team first");
      return;
    }
    setTeamDownloading(true);
    try {
      const response = await crmApi.get(`/reports/export/team/${selectedTeamId}`, { responseType: "blob" });
      const team = teams.find(t => t.id === selectedTeamId || t.team_id === selectedTeamId);
      const teamName = (team?.name || "Team").replace(/\s+/g, "_");
      triggerDownload(response.data, `${teamName}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`${team?.name || "Team"} report downloaded`);
      setTeamSelectorOpen(false);
    } catch (err) {
      const msg = err.response?.status === 403
        ? "Not authorised to download this team's report."
        : "Failed to download team report";
      toast.error(msg);
    } finally {
      setTeamDownloading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time data from your CRM</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ── FOUNDER / BDO Download Controls ── */}
          {isFounderOrBdo && (
            <>
              {/* All Teams Download */}
              <button
                id="btn-download-all-teams"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
              >
                {downloading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Download className="w-4 h-4" />
                }
                Download All Teams Report
              </button>

              {/* Individual Team Download — with dropdown */}
              <div className="relative">
                <button
                  id="btn-download-team-selector"
                  onClick={() => setTeamSelectorOpen(!teamSelectorOpen)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition shadow-sm"
                >
                  <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                  Download Individual Team
                  <ChevronDown className={`w-4 h-4 transition-transform ${teamSelectorOpen ? "rotate-180" : ""}`} />
                </button>

                {teamSelectorOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-2xl z-40 p-3 space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Select Team</p>
                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 rounded-lg border border-gray-100">
                      {loading ? (
                        <p className="text-xs text-gray-400 p-3 text-center">Loading teams...</p>
                      ) : teams.length === 0 ? (
                        <p className="text-xs text-gray-400 p-3 text-center">No teams found</p>
                      ) : (
                        teams.map(t => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTeamId(t.id)}
                            className={`p-2.5 cursor-pointer text-sm transition flex items-center justify-between ${
                              selectedTeamId === t.id
                                ? "bg-indigo-50 text-indigo-900 font-semibold"
                                : "hover:bg-gray-50 text-gray-800"
                            }`}
                          >
                            <div>
                              <p className="font-medium">{t.name}</p>
                              <p className="text-xs text-gray-500">{t.team_leader_name || t.team_id}</p>
                            </div>
                            {selectedTeamId === t.id && (
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      id="btn-confirm-team-download"
                      onClick={handleDownloadTeam}
                      disabled={!selectedTeamId || teamDownloading}
                      className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                    >
                      {teamDownloading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Download className="w-4 h-4" />
                      }
                      {selectedTeamId ? `Download ${teams.find(t => t.id === selectedTeamId)?.name || "Team"} Report` : "Select a team above"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TEAM LEADER Download Control ── */}
          {isTeamLead && (
            <button
              id="btn-download-my-team"
              onClick={handleDownloadAll}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
            >
              {downloading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Download className="w-4 h-4" />
              }
              Download My Team Report
            </button>
          )}

          {/* ── EXECUTIVE / TRAINEE — no download button ── */}
          {!canDownload && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              Report downloads require Team Leader or higher access
            </div>
          )}

          <button
            id="btn-refresh-reports"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Close team selector on outside click */}
      {teamSelectorOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setTeamSelectorOpen(false)} />
      )}

      {/* Role badge info */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Shield className="w-3.5 h-3.5 text-indigo-400" />
        <span>
          Viewing data for: <strong className="text-gray-700">{employee?.name}</strong>
          {" "}&mdash;{" "}
          <span className={`inline-block px-1.5 py-0.5 rounded font-semibold text-xs ${roleBadgeClass(role)}`}>
            {roleLabel(role)}
          </span>
        </span>
      </div>

      {/* ── Analytics Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" /> Leads by Source
          </h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-2 bg-gray-100 rounded w-24" />
                  <div className="h-2 bg-gray-100 rounded flex-1" />
                </div>
              ))}
            </div>
          ) : <SourceChart data={sources} />}
        </div>

        {/* Lead Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Lead Status Funnel
          </h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-2 bg-gray-100 rounded w-32" />
                  <div className="h-2 bg-gray-100 rounded flex-1" />
                </div>
              ))}
            </div>
          ) : <FunnelChart data={statuses} />}
        </div>
      </div>

      {/* ── Employee Performance Table (Founder, BDO, Team Lead only) ── */}
      {["founder", "admin", "bdo", "team_lead"].includes(role) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" /> Employee Performance
            {isTeamLead && <span className="text-xs font-normal text-gray-400 ml-1">(Your team)</span>}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/70">
                <tr>
                  {["#", "Employee", "Role", "Leads", "Won", "Conversion", "Tasks Done", "Site Visits"].map(h => (
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
                  : performance.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-400">
                        No performance data available
                      </td>
                    </tr>
                  )
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

      {/* ── No access message for executive/trainee ── */}
      {["executive", "trainee", "dpo"].includes(role) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Download Access Restricted</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Report downloads are available to Team Leaders and above. Contact your Team Leader or BDO to request a report.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
