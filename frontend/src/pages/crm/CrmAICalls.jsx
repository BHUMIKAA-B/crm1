/**
 * CrmAICalls — AI Calling Agent Dashboard
 *
 * Displays all AI-initiated call jobs with stats, search, filtering,
 * and a detail drawer showing conversation history, collected answers,
 * and AI-generated summaries.
 */
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  PhoneCall, Search, RefreshCw, Phone, User, Clock,
  CheckCircle2, XCircle, AlertCircle, ArrowUpRight,
  ChevronRight, X, Loader2, MessageSquare, Play,
  Ban, RotateCcw, Settings, Volume2, VolumeX,
  Filter, Calendar, Bot
} from "lucide-react";
import crmApi from "@/api/crmClient";
import { useCrmAuthStore } from "@/store/crmAuthStore";

const CALL_STATUS = {
  queued:          { label: "Queued",     bg: "bg-slate-500/10 text-slate-500 border-slate-500/30",  icon: Clock },
  initiating:      { label: "Initiating", bg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",    icon: PhoneCall },
  ringing:         { label: "Ringing",    bg: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", icon: Phone },
  answered:        { label: "Answered",   bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",    icon: Volume2 },
  completed:       { label: "Completed",  bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  no_answer:       { label: "No Answer",  bg: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: VolumeX },
  busy:            { label: "Busy",       bg: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Ban },
  failed:          { label: "Failed",     bg: "bg-red-500/10 text-red-400 border-red-500/30",       icon: XCircle },
  cancelled:       { label: "Cancelled",  bg: "bg-gray-500/10 text-gray-400 border-gray-500/30",    icon: Ban },
  retry_scheduled: { label: "Retry Scheduled", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: RotateCcw },
};

const OUTCOME_LABELS = {
  completed: "Qualification Complete",
  opt_out: "Opted Out of Calls",
  callback_requested: "Callback Requested",
  human_callback_requested: "Human Rep Requested",
  voicemail: "Voicemail Left",
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function CrmAICalls() {
  const { employee } = useCrmAuthStore();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const isManagement = ["founder", "admin", "bdo", "team_lead"].includes(employee?.role);

  const fetchStats = useCallback(() => {
    crmApi.get("/ai-calls/stats")
      .then(({ data }) => setStats(data || {}))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();

    crmApi.get("/ai-calls", { params })
      .then(({ data }) => setItems(data || []))
      .catch(() => toast.error("Failed to load AI calls"))
      .finally(() => setLoading(false));
  }, [statusFilter, searchQuery]);

  const fetchSettings = useCallback(() => {
    crmApi.get("/calling-settings")
      .then(({ data }) => setSettings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
    fetchItems();
    fetchSettings();
  }, [fetchStats, fetchItems, fetchSettings]);

  const handleOpenDetail = (jobId) => {
    crmApi.get(`/ai-calls/${jobId}`)
      .then(({ data }) => setSelectedItem(data))
      .catch(() => toast.error("Failed to load call details"));
  };

  const handleRetry = async () => {
    if (!selectedItem) return;
    setRetrying(true);
    try {
      await crmApi.post(`/ai-calls/${selectedItem.id}/retry`);
      toast.success("Call retry queued");
      setSelectedItem((prev) => ({ ...prev, status: "queued" }));
      fetchStats();
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to retry call");
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedItem) return;
    setCancelling(true);
    try {
      await crmApi.post(`/ai-calls/${selectedItem.id}/cancel`);
      toast.success("Call cancelled");
      setSelectedItem((prev) => ({ ...prev, status: "cancelled" }));
      fetchStats();
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await crmApi.patch("/calling-settings", settings);
      toast.success("Settings saved");
      setShowSettings(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[90rem] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-7 h-7 text-vs-gold" />
            AI Calling Agent
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Automated outbound calls to website enquiries with AI-powered qualification.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          {isManagement && (
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          )}
          <button
            onClick={() => { fetchStats(); fetchItems(); }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: "Total Calls", value: stats.total || 0, color: "gray" },
          { label: "Queued", value: stats.queued || 0, color: "slate" },
          { label: "Answered", value: stats.answered || 0, color: "blue" },
          { label: "Completed", value: stats.completed || 0, color: "emerald" },
          { label: "Failed", value: stats.failed || 0, color: "red" },
          { label: "No Answer", value: stats.no_answer || 0, color: "orange" },
          { label: "Retry", value: stats.retry_scheduled || 0, color: "indigo" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-${color}-200 dark:border-${color}-900/40 shadow-sm`}>
            <div className={`text-xs font-semibold text-${color}-600 dark:text-${color}-400 uppercase tracking-wider`}>{label}</div>
            <div className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400 mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchItems(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, enquiry ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-vs-gold"
          />
        </form>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-slate-100 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="answered">Answered</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="no_answer">No Answer</option>
            <option value="retry_scheduled">Retry Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Call Jobs Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-gray-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-vs-gold" /> Loading AI calls...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-12 space-y-3">
            <PhoneCall className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">No AI Calls Found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              AI call jobs will appear here automatically after enquiries are submitted on the website.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Lead</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5">Property</th>
                  <th className="p-3.5">Call Status</th>
                  <th className="p-3.5">Outcome</th>
                  <th className="p-3.5">Attempts</th>
                  <th className="p-3.5">Last Call</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60 text-gray-700 dark:text-slate-200">
                {items.map((item) => {
                  const statusInfo = CALL_STATUS[item.status] || CALL_STATUS.queued;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(item.id)}
                    >
                      <td className="p-3.5 pl-5">
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{item.name}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-gray-800 dark:text-slate-200 font-medium font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-gray-400" /> {item.phone}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium text-[11px]">
                          {item.source || "Enquiry"}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-[160px]">
                        <div className="truncate font-medium text-gray-900 dark:text-slate-100">
                          {item.property_title || "General"}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {item.call_outcome ? (OUTCOME_LABELS[item.call_outcome] || item.call_outcome) : "—"}
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        {item.attempt_count || 0}
                      </td>
                      <td className="p-3.5 text-[11px] text-gray-500 dark:text-slate-400">
                        {formatDate(item.last_attempt_at)}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenDetail(item.id); }}
                          className="px-2.5 py-1 text-xs font-semibold text-vs-gold hover:bg-vs-gold/10 rounded transition-colors inline-flex items-center gap-1"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs p-2 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-vs-gold" />
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${(CALL_STATUS[selectedItem.status] || CALL_STATUS.queued).bg}`}>
                    {(CALL_STATUS[selectedItem.status] || CALL_STATUS.queued).label}
                  </span>
                  {selectedItem.category && (
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium">
                      {selectedItem.category?.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                  AI Call — {selectedItem.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700 dark:text-slate-300">

              {/* Call Info */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" /> Call Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Phone</span>
                    <strong className="text-gray-900 dark:text-slate-100 font-mono">{selectedItem.phone}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Attempts</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.attempt_count || 0} / {selectedItem.max_retries || 3}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Duration</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.call_duration_seconds ? `${selectedItem.call_duration_seconds}s` : "—"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Outcome</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.call_outcome ? (OUTCOME_LABELS[selectedItem.call_outcome] || selectedItem.call_outcome) : "—"}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Created</span>
                    <strong className="text-gray-900 dark:text-slate-100">{formatDate(selectedItem.created_at)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Completed</span>
                    <strong className="text-gray-900 dark:text-slate-100">{formatDate(selectedItem.completed_at)}</strong>
                  </div>
                </div>
                {selectedItem.error && (
                  <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800/40">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                    {selectedItem.error}
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2">
                {selectedItem.human_callback_requested && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[11px] font-semibold border border-purple-200 dark:border-purple-800/40">
                    <User className="w-3 h-3" /> Human Callback Requested
                  </span>
                )}
                {selectedItem.opt_out_recorded && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-semibold border border-red-200 dark:border-red-800/40">
                    <Ban className="w-3 h-3" /> Do Not Call — Opted Out
                  </span>
                )}
              </div>

              {/* AI Summary */}
              {selectedItem.conversation_summary && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800/40 space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4" /> AI Conversation Summary
                  </div>
                  <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedItem.conversation_summary}
                  </p>
                </div>
              )}

              {/* Next Action */}
              {selectedItem.next_action && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Next Action: </span>
                  <span className="text-xs text-amber-800 dark:text-amber-300">{selectedItem.next_action}</span>
                </div>
              )}

              {/* Collected Answers */}
              {selectedItem.collected_answers && Object.keys(selectedItem.collected_answers).length > 0 && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> Collected Qualification Answers
                  </div>
                  <div className="space-y-2">
                    {Object.entries(selectedItem.collected_answers).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 dark:text-slate-400 min-w-[140px] capitalize shrink-0 pt-0.5">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-gray-900 dark:text-slate-100 font-medium">{value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation History */}
              {selectedItem.conversation_history && selectedItem.conversation_history.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> Conversation Transcript
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedItem.conversation_history.map((msg, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs ${msg.role === "agent" ? "flex-row" : "flex-row-reverse"}`}>
                        <div className={`p-2 rounded-lg max-w-[80%] ${
                          msg.role === "agent"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200"
                            : "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        }`}>
                          <div className="font-semibold text-[10px] uppercase mb-0.5 opacity-60">
                            {msg.role === "agent" ? "AI Agent" : "Lead"}
                          </div>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Controls */}
              {isManagement && (
                <div className="p-4 rounded-xl bg-vs-gold/5 border border-vs-gold/20 space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold">Actions</div>
                  <div className="flex flex-wrap gap-3">
                    {["failed", "no_answer", "busy", "retry_scheduled"].includes(selectedItem.status) && (
                      <button
                        onClick={handleRetry}
                        disabled={retrying}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 shadow"
                      >
                        {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        Retry Call
                      </button>
                    )}
                    {["queued", "retry_scheduled", "initiating"].includes(selectedItem.status) && (
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 shadow"
                      >
                        {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                        Cancel Call
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && settings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-900/60">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-vs-gold" />
                AI Calling Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Auto-call toggle */}
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Auto-call on new enquiry</span>
                <input
                  type="checkbox"
                  checked={settings.auto_call_on_enquiry ?? true}
                  onChange={(e) => setSettings((s) => ({ ...s, auto_call_on_enquiry: e.target.checked }))}
                  className="accent-vs-gold w-5 h-5"
                />
              </label>

              {/* Calling hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Start Hour (IST)</label>
                  <input
                    type="number" min="0" max="23"
                    value={settings.calling_hour_start ?? 9}
                    onChange={(e) => setSettings((s) => ({ ...s, calling_hour_start: parseInt(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">End Hour (IST)</label>
                  <input
                    type="number" min="0" max="23"
                    value={settings.calling_hour_end ?? 21}
                    onChange={(e) => setSettings((s) => ({ ...s, calling_hour_end: parseInt(e.target.value) }))}
                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Max retries */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Max Call Retries</label>
                <input
                  type="number" min="0" max="10"
                  value={settings.max_retries ?? 3}
                  onChange={(e) => setSettings((s) => ({ ...s, max_retries: parseInt(e.target.value) }))}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2 bg-vs-gold text-vs-bg font-semibold rounded-lg text-sm hover:bg-amber-500 transition-colors inline-flex items-center gap-2"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
