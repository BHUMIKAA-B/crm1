import React, { useEffect, useState, useCallback, useRef } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import { roleLabel, roleBadgeClass } from "../../lib/crmPermissions";
import toast from "react-hot-toast";
import {
  BarChart3, TrendingUp, Users, RefreshCw, Medal,
  ArrowUpRight, Download, ChevronDown, Shield, Lock,
  Upload, FileText, CheckCircle, XCircle, AlertCircle, History
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

// ── Upload Result Card ─────────────────────────────────────
function UploadResultCard({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <span className="font-semibold text-gray-900 text-sm">Upload Complete</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕ Dismiss</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{result.records_imported}</p>
          <p className="text-xs text-emerald-700 font-medium mt-0.5">Records Imported</p>
        </div>
        <div className={`rounded-lg p-3 text-center border ${result.records_rejected > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
          <p className={`text-2xl font-bold ${result.records_rejected > 0 ? "text-red-600" : "text-gray-400"}`}>{result.records_rejected}</p>
          <p className={`text-xs font-medium mt-0.5 ${result.records_rejected > 0 ? "text-red-700" : "text-gray-500"}`}>Records Rejected</p>
        </div>
      </div>
      {result.records_rejected > 0 && result.rejected_rows?.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Rejection Details (first {result.rejected_rows.length} shown):
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {result.rejected_rows.map((r, i) => (
              <div key={i} className="text-xs text-red-600">
                <span className="font-semibold">Row {r.row}:</span> {r.reasons?.join("; ")}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500">
        File: <span className="font-medium">{result.file_name}</span> ·
        Uploaded: {result.upload_date ? new Date(result.upload_date).toLocaleString() : "—"}
      </p>
    </div>
  );
}

// ── Upload History Table ───────────────────────────────────
function UploadHistoryTable({ history, loading }) {
  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loading history...</div>;
  if (!history?.length) return <div className="py-8 text-center text-sm text-gray-400">No uploads yet.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-50 text-sm">
        <thead className="bg-gray-50/70">
          <tr>
            {["File Name", "Uploaded By", "Date", "Imported", "Rejected"].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {history.map((rec, i) => (
            <tr key={rec.id || i} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-3 py-2 text-xs font-mono text-gray-700 max-w-xs truncate">{rec.file_name}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{rec.uploaded_by_name || rec.uploaded_by}</td>
              <td className="px-3 py-2 text-xs text-gray-500">{rec.upload_date ? new Date(rec.upload_date).toLocaleDateString() : "—"}</td>
              <td className="px-3 py-2">
                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">{rec.records_imported}</span>
              </td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${rec.records_rejected > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                  {rec.records_rejected}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Upload Panel ─────────────────────────────────────────────
function UploadPanel({ title, description, onUpload, uploading, result, onDismiss, history, historyLoading }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleFile = (f) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext)) {
      toast.error("Only .xlsx and .csv files are accepted.");
      return;
    }
    setSelectedFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }
    onUpload(selectedFile);
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-500" />
            {title}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        {history && (
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? "Hide History" : "Upload History"}
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        {selectedFile ? (
          <div>
            <p className="text-sm font-semibold text-indigo-600">{selectedFile.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">({(selectedFile.size / 1024).toFixed(1)} KB) — Click or drag to change</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 font-medium">Drop file here or <span className="text-indigo-600 underline">browse</span></p>
            <p className="text-xs text-gray-400 mt-1">Supported: Excel (.xlsx), CSV (.csv)</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Format hint */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-semibold mb-0.5">Required columns: <code className="bg-blue-100 px-1 rounded">date</code>, <code className="bg-blue-100 px-1 rounded">activity_type</code></p>
          <p className="text-blue-600">Optional: <code className="bg-blue-100 px-1 rounded">customer_name</code>, <code className="bg-blue-100 px-1 rounded">notes</code>, <code className="bg-blue-100 px-1 rounded">outcome</code>
          {title.includes("Team") && <>, <code className="bg-blue-100 px-1 rounded">employee_name</code>, <code className="bg-blue-100 px-1 rounded">employee_id</code></>}
          </p>
          <p className="text-blue-500 mt-1">Date format: YYYY-MM-DD</p>
        </div>
      </div>

      {/* Upload Button */}
      <button
        id={title.includes("Team") ? "btn-upload-team-report" : "btn-upload-executive-report"}
        onClick={handleSubmit}
        disabled={uploading || !selectedFile}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {uploading ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="w-4 h-4" /> Upload {selectedFile ? selectedFile.name : "File"}</>
        )}
      </button>

      {/* Result */}
      {result && <UploadResultCard result={result} onClose={onDismiss} />}

      {/* History */}
      {showHistory && history && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Upload History
          </p>
          <UploadHistoryTable history={history} loading={historyLoading} />
        </div>
      )}
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
  const isExecutive = role === "executive";
  const isTrainee = role === "trainee";
  const canDownload = isFounderOrBdo || isTeamLead;
  const canUploadOwn = isExecutive || isTrainee;
  const canUploadTeam = isTeamLead || isFounderOrBdo;

  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [teamDownloading, setTeamDownloading] = useState(false);

  // Upload state
  const [uploadingExec, setUploadingExec] = useState(false);
  const [uploadingTeam, setUploadingTeam] = useState(false);
  const [execUploadResult, setExecUploadResult] = useState(null);
  const [teamUploadResult, setTeamUploadResult] = useState(null);
  const [execHistory, setExecHistory] = useState([]);
  const [teamHistory, setTeamHistory] = useState([]);
  const [execHistoryLoading, setExecHistoryLoading] = useState(false);
  const [teamHistoryLoading, setTeamHistoryLoading] = useState(false);

  // Team selector state (Founder / BDO individual team download)
  const [teamSelectorOpen, setTeamSelectorOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // Download format modal state
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null); // 'all' or 'team'

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

      // Fetch teams list for Founder / BDO team selector, or Team Leader team badge
      if (isFounderOrBdo) {
        const teamsRes = await crmApi.get("/reports/teams");
        setTeams(teamsRes.data);
      } else if (isTeamLead) {
        const teamsRes = await crmApi.get("/teams");
        setTeams(teamsRes.data);
      }

      // Fetch upload histories
      if (canUploadOwn) {
        setExecHistoryLoading(true);
        crmApi.get("/reports/upload/executive/history")
          .then(r => setExecHistory(r.data))
          .catch(() => {})
          .finally(() => setExecHistoryLoading(false));
      }
      if (canUploadTeam) {
        setTeamHistoryLoading(true);
        crmApi.get("/reports/upload/team/history")
          .then(r => setTeamHistory(r.data))
          .catch(() => {})
          .finally(() => setTeamHistoryLoading(false));
      }
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [role, isFounderOrBdo, isTeamLead, canUploadOwn, canUploadTeam]);

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

  // All-scope download
  const handleDownloadAll = async (fmt = "xlsx") => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const response = await crmApi.get(`/reports/export?format=${fmt}`, { responseType: "blob" });
      const ext = fmt === "csv" ? "csv" : fmt === "pdf" ? "pdf" : "xlsx";
      const filename = isTeamLead
        ? `MyTeam_Report_${new Date().toISOString().slice(0, 10)}.${ext}`
        : `AllTeams_Report_${new Date().toISOString().slice(0, 10)}.${ext}`;
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
  const handleDownloadTeam = async (fmt = "xlsx") => {
    if (!isFounderOrBdo || !selectedTeamId) {
      toast.error("Please select a team first");
      return;
    }
    setTeamDownloading(true);
    try {
      const response = await crmApi.get(`/reports/export/team/${selectedTeamId}?format=${fmt}`, { responseType: "blob" });
      const ext = fmt === "csv" ? "csv" : fmt === "pdf" ? "pdf" : "xlsx";
      const team = teams.find(t => t.id === selectedTeamId || t.team_id === selectedTeamId);
      const teamName = (team?.name || "Team").replace(/\s+/g, "_");
      triggerDownload(response.data, `${teamName}_Report_${new Date().toISOString().slice(0, 10)}.${ext}`);
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

  // ── Upload handlers ────────────────────────────────────
  const handleExecUpload = async (file) => {
    setUploadingExec(true);
    setExecUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await crmApi.post("/reports/upload/executive", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setExecUploadResult(res.data);
      toast.success(`Upload complete: ${res.data.records_imported} imported, ${res.data.records_rejected} rejected`);
      // Refresh history
      const h = await crmApi.get("/reports/upload/executive/history");
      setExecHistory(h.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Upload failed. Please check your file.");
    } finally {
      setUploadingExec(false);
    }
  };

  const handleTeamUpload = async (file) => {
    setUploadingTeam(true);
    setTeamUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await crmApi.post("/reports/upload/team", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setTeamUploadResult(res.data);
      toast.success(`Upload complete: ${res.data.records_imported} imported, ${res.data.records_rejected} rejected`);
      // Refresh history
      const h = await crmApi.get("/reports/upload/team/history");
      setTeamHistory(h.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Upload failed. Please check your file.");
    } finally {
      setUploadingTeam(false);
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time data from your CRM</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ── FOUNDER / BDO Download Controls ── */}
          {isFounderOrBdo && (
            <>
              {/* All Teams Download */}
              <button
                id="btn-download-all-teams"
                onClick={() => { setDownloadTarget('all'); setFormatModalOpen(true); }}
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
                      onClick={() => { setDownloadTarget('team'); setFormatModalOpen(true); }}
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
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900 font-semibold shadow-xs">
                <span className="text-xs uppercase text-indigo-500 font-bold tracking-wider">Team:</span>
                <span className="font-bold">{teams[0]?.name || "Your Team"}</span>
              </div>
              <button
                id="btn-download-my-team"
                onClick={() => { setDownloadTarget('all'); setFormatModalOpen(true); }}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
              >
                {downloading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Download className="w-4 h-4" />
                }
                Download {teams[0]?.name || "My Team"} Report
              </button>
            </div>
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
                  {["#", "Employee ID", "Employee Name", "Role", "Leads Updates", "Token Received", "Site Visits", "Conversions (Deals)"].map(h => (
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
                      <td className="px-3 py-3 text-xs font-mono font-semibold text-gray-600">
                        {emp.employee_id}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {emp.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass(emp.role)}`}>
                          {emp.role_display || roleLabel(emp.role)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900">{emp.leads_updates}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-indigo-600">{emp.token_received}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{emp.site_visits}</td>
                      <td className="px-3 py-3 text-sm font-bold text-emerald-600">{emp.conversions_based_on_deals}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EXECUTIVE / TRAINEE Upload Section ── */}
      {canUploadOwn && (
        <UploadPanel
          title="Upload My Report Data"
          description="Upload your personal activity report. Your identity is verified by the system — you cannot upload data for other employees."
          onUpload={handleExecUpload}
          uploading={uploadingExec}
          result={execUploadResult}
          onDismiss={() => setExecUploadResult(null)}
          history={execHistory}
          historyLoading={execHistoryLoading}
        />
      )}

      {/* ── TEAM LEADER Upload Section ── */}
      {canUploadTeam && (
        <UploadPanel
          title="Upload Team Report Data"
          description="Upload report data for your team. Rows with employees not in your team will be automatically rejected."
          onUpload={handleTeamUpload}
          uploading={uploadingTeam}
          result={teamUploadResult}
          onDismiss={() => setTeamUploadResult(null)}
          history={teamHistory}
          historyLoading={teamHistoryLoading}
        />
      )}

      {/* ── No access message for executive/trainee download restriction ── */}
      {["executive", "trainee", "dpo"].includes(role) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Report Download Access Restricted</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Report downloads are available to Team Leaders and above. Contact your Team Leader or BDO to request a report.
            </p>
          </div>
        </div>
      )}
      
      {/* ── Format Selection Modal ── */}
      {formatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Download Team Report</h3>
              <p className="text-sm text-gray-500 mb-6">How would you like to download your report?</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setFormatModalOpen(false);
                    if (downloadTarget === 'all') handleDownloadAll('xlsx');
                    else handleDownloadTeam('xlsx');
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-green-100 hover:border-green-500 hover:bg-green-50 transition-colors group"
                >
                  <FileText className="w-8 h-8 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-gray-800">Excel</span>
                  <span className="text-xs text-gray-500 mt-1">Detailed Data</span>
                </button>
                <button
                  onClick={() => {
                    setFormatModalOpen(false);
                    if (downloadTarget === 'all') handleDownloadAll('pdf');
                    else handleDownloadTeam('pdf');
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50 transition-colors group"
                >
                  <FileText className="w-8 h-8 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-gray-800">PDF</span>
                  <span className="text-xs text-gray-500 mt-1">Presentation</span>
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => setFormatModalOpen(false)}
                className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
