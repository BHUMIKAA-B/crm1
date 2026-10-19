import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search, Loader2, Landmark, RefreshCw, X, Download,
  ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "all",         label: "All Statuses" },
  { value: "new",         label: "New" },
  { value: "contacted",   label: "Contacted" },
  { value: "follow_up",   label: "Follow-up" },
  { value: "in_progress", label: "In Progress" },
  { value: "converted",   label: "Converted" },
  { value: "closed",      label: "Closed" },
];

const EMP_OPTIONS = [
  { value: "all",           label: "All Employment" },
  { value: "Salaried",      label: "Salaried" },
  { value: "Self-employed", label: "Self-employed" },
  { value: "Business",      label: "Business" },
  { value: "Other",         label: "Other" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name",   label: "Customer Name" },
];

const STATUS_BADGE = {
  new:         "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  contacted:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  follow_up:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  converted:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed:      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function StatusBadge({ status }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[status] || "bg-vs-bg text-vs-text-secondary"}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="card p-4 flex flex-col gap-1 border border-vs-border">
      <div className="text-xs font-semibold uppercase tracking-wider text-vs-text-secondary">{label}</div>
      <div className={`text-3xl font-bold font-display ${color}`}>{value ?? 0}</div>
    </div>
  );
}

export default function AdminHomeLoanEnquiries() {
  const [items,    setItems]    = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("all");
  const [empType,  setEmpType]  = useState("all");
  const [sort,     setSort]     = useState("newest");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null);   // detail modal
  const [saving,   setSaving]   = useState(false);
  const [notesVal, setNotesVal] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (status !== "all")  params.status = status;
    if (empType !== "all") params.employment_type = empType;
    if (search.trim())     params.search = search.trim();
    params.sort = sort;

    api.get("/admin/home-loan-enquiries", { params })
      .then(({ data }) => setItems(data || []))
      .catch(() => toast.error("Failed to load loan enquiries"))
      .finally(() => setLoading(false));
  }, [status, empType, search, sort]);

  const loadStats = useCallback(() => {
    api.get("/admin/home-loan-enquiries/stats")
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  // client-side search already sent to server, but also support instant filter
  const rows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);
  const pages = Math.ceil(items.length / PAGE_SIZE);

  const openDetail = (item) => {
    setSelected(item);
    setNotesVal(item.admin_notes || "");
    setNewStatus(item.status);
  };
  const closeDetail = () => setSelected(null);

  const saveChanges = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/admin/home-loan-enquiries/${selected.id}`, {
        status: newStatus,
        admin_notes: notesVal,
      });
      toast.success("Enquiry updated");
      setSelected((prev) => ({ ...prev, status: newStatus, admin_notes: notesVal }));
      load();
      loadStats();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get("/admin/reports/home-loan-enquiries", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "home_loan_enquiries.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setEmpType("all");
    setSort("newest");
    setPage(1);
  };

  const hasFilters = search || status !== "all" || empType !== "all" || sort !== "newest";

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-vs-text-primary text-xl flex items-center gap-2">
            <Landmark size={20} className="text-vs-gold" />
            Home Loan Enquiries
            <span className="text-vs-text-secondary font-normal text-base">({items.length})</span>
          </h2>
          <p className="text-xs text-vs-text-secondary mt-0.5">
            Manage property financing enquiries received from visitors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { load(); loadStats(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-vs-border text-sm text-vs-text-secondary hover:text-vs-gold hover:border-vs-gold transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-vs-border text-sm text-vs-text-secondary hover:text-vs-gold hover:border-vs-gold transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total"       value={stats?.total}       color="text-vs-text-primary" />
        <StatCard label="New"         value={stats?.new}         color="text-blue-600 dark:text-blue-400" />
        <StatCard label="Contacted"   value={stats?.contacted}   color="text-purple-600 dark:text-purple-400" />
        <StatCard label="In Progress" value={stats?.in_progress} color="text-indigo-600 dark:text-indigo-400" />
        <StatCard label="Converted"   value={stats?.converted}   color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Closed"      value={stats?.closed}      color="text-vs-text-secondary" />
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-text-secondary" />
          <input
            className="input-field !pl-8 !py-2 !text-sm w-full"
            placeholder="Name, phone, email, ID, property…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-vs-text-secondary shrink-0" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input-field !py-2 !text-xs cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Employment filter */}
        <select
          value={empType}
          onChange={(e) => { setEmpType(e.target.value); setPage(1); }}
          className="input-field !py-2 !text-xs cursor-pointer"
        >
          {EMP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="input-field !py-2 !text-xs cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-vs-gold hover:underline flex items-center gap-1"
          >
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-vs-bg">
            <tr>
              {["Enquiry ID", "Customer", "Contact", "Property", "Loan Amount", "Employment", "Status", "Date", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <Loader2 className="animate-spin text-vs-gold mx-auto" size={22} />
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <Landmark size={40} className="text-vs-text-muted mx-auto mb-3" />
                  <p className="font-medium text-vs-text-primary text-sm">No home loan enquiries yet.</p>
                  <p className="text-xs text-vs-text-secondary mt-1">
                    New enquiries submitted through the public website will appear here.
                  </p>
                </td>
              </tr>
            )}
            {!loading && rows.map((item) => (
              <tr
                key={item.id}
                className="border-t border-vs-border hover:bg-vs-bg/50 transition-colors"
              >
                <td className="px-4 py-3 font-mono font-semibold text-vs-gold text-xs whitespace-nowrap">
                  {item.loan_enquiry_id || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-vs-text-primary">{item.full_name}</div>
                </td>
                <td className="px-4 py-3 text-vs-text-secondary">
                  <div>{item.phone}</div>
                  <div className="text-xs truncate max-w-[160px]">{item.email}</div>
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  <div className="font-medium text-vs-text-primary truncate">
                    {item.property_name || "General Financing"}
                  </div>
                  <div className="text-xs text-vs-text-secondary truncate">
                    {item.preferred_location || "India"}
                  </div>
                </td>
                <td className="px-4 py-3 text-vs-text-primary font-medium whitespace-nowrap">
                  {item.loan_amount || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-vs-bg text-vs-text-secondary font-medium">
                    {item.employment_type || "Salaried"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-vs-text-secondary whitespace-nowrap text-xs">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openDetail(item)}
                    className="text-xs font-semibold text-vs-gold hover:underline whitespace-nowrap"
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-vs-text-secondary">
          <span>
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, items.length)} of {items.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded border border-vs-border hover:bg-vs-bg disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 rounded border border-vs-border hover:bg-vs-bg disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-vs-card border border-vs-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-vs-border bg-vs-bg shrink-0">
              <div>
                <span className="font-mono text-xs font-bold text-vs-gold">{selected.loan_enquiry_id}</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <h3 className="font-display font-semibold text-vs-text-primary text-base">
                    Loan Enquiry — {selected.full_name}
                  </h3>
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <button onClick={closeDetail} className="p-1.5 rounded hover:bg-vs-border text-vs-text-secondary">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">

              {/* Customer Details */}
              <section>
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold mb-2">Customer Details</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-vs-bg rounded-xl p-4 border border-vs-border text-xs">
                  <div><span className="text-vs-text-secondary block">Name</span><strong className="text-vs-text-primary">{selected.full_name}</strong></div>
                  <div><span className="text-vs-text-secondary block">Phone</span><strong className="text-vs-text-primary">{selected.phone}</strong></div>
                  <div><span className="text-vs-text-secondary block">Email</span><strong className="text-vs-text-primary break-all">{selected.email}</strong></div>
                </div>
              </section>

              {/* Property Details */}
              <section>
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold mb-2">Property Details</div>
                <div className="grid grid-cols-2 gap-3 bg-vs-bg rounded-xl p-4 border border-vs-border text-xs">
                  <div><span className="text-vs-text-secondary block">Property</span><strong className="text-vs-text-primary">{selected.property_name || "General Financing Enquiry"}</strong></div>
                  <div><span className="text-vs-text-secondary block">Location</span><strong className="text-vs-text-primary">{selected.preferred_location || "India"}</strong></div>
                  {selected.property_id && <div><span className="text-vs-text-secondary block">Property ID</span><strong className="text-vs-text-primary font-mono">{selected.property_id}</strong></div>}
                  {selected.property_value && <div><span className="text-vs-text-secondary block">Property Value</span><strong className="text-vs-text-primary">{selected.property_value}</strong></div>}
                </div>
              </section>

              {/* Loan Requirement */}
              <section>
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold mb-2">Loan Requirement</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-vs-bg rounded-xl p-4 border border-vs-border text-xs">
                  <div><span className="text-vs-text-secondary block">Loan Amount</span><strong className="text-vs-text-primary">{selected.loan_amount || "—"}</strong></div>
                  <div><span className="text-vs-text-secondary block">Employment</span><strong className="text-vs-text-primary">{selected.employment_type || "Salaried"}</strong></div>
                  <div><span className="text-vs-text-secondary block">Monthly Income</span><strong className="text-vs-text-primary">{selected.monthly_income_range || "—"}</strong></div>
                  <div><span className="text-vs-text-secondary block">Preferred Bank</span><strong className="text-vs-text-primary">{selected.preferred_bank || "—"}</strong></div>
                </div>
              </section>

              {/* Additional Notes from customer */}
              {selected.message && (
                <section>
                  <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold mb-2">Customer Message</div>
                  <div className="bg-vs-bg rounded-xl p-4 border border-vs-border text-xs text-vs-text-primary leading-relaxed whitespace-pre-line">
                    {selected.message}
                  </div>
                </section>
              )}

              {/* Tracking */}
              <section>
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold mb-2">Tracking</div>
                <div className="grid grid-cols-2 gap-3 bg-vs-bg rounded-xl p-4 border border-vs-border text-xs">
                  <div><span className="text-vs-text-secondary block">Enquiry ID</span><strong className="text-vs-text-primary font-mono">{selected.loan_enquiry_id}</strong></div>
                  <div><span className="text-vs-text-secondary block">Submitted</span><strong className="text-vs-text-primary">{selected.created_at ? new Date(selected.created_at).toLocaleString("en-IN") : "—"}</strong></div>
                  <div><span className="text-vs-text-secondary block">Source</span><strong className="text-vs-text-primary">{selected.source || "Public Website"}</strong></div>
                  <div><span className="text-vs-text-secondary block">Last Updated</span><strong className="text-vs-text-primary">{selected.updated_at ? new Date(selected.updated_at).toLocaleString("en-IN") : "—"}</strong></div>
                </div>
              </section>

              {/* CRM Controls */}
              <section className="bg-vs-gold/5 border border-vs-gold/20 rounded-xl p-4 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold">Admin Controls</div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-vs-text-secondary mb-1">Update Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input-field !py-1.5 !text-xs w-full max-w-xs cursor-pointer"
                  >
                    {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                    Internal Admin Notes <span className="text-[10px] text-vs-text-muted">(never shown publicly)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={notesVal}
                    onChange={(e) => setNotesVal(e.target.value)}
                    placeholder="e.g. Customer requested SBI financing options. Follow up scheduled for Monday."
                    className="input-field !text-xs w-full"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-vs-gold hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                    Save Changes
                  </button>
                  <button
                    onClick={closeDetail}
                    className="px-4 py-2 border border-vs-border text-xs rounded-lg text-vs-text-secondary hover:bg-vs-bg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
