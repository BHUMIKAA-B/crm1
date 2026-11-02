import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Sofa, Search, Filter, RefreshCw, User, Phone, Building2,
  Calendar, CheckCircle2, Clock, AlertCircle, ChevronRight, X,
  Loader2, MapPin, IndianRupee, FileImage, Shield, Home,
  MessageSquare, UserCheck
} from "lucide-react";
import api from "@/api/client";
import { useCrmAuthStore } from "@/store/crmAuthStore";

/* ─── STATUS CONFIG ─────────────────────────────────────────────────────────── */

const STATUS_BADGES = {
  new: { label: "New", bg: "bg-blue-500/10 text-blue-600 border-blue-500/30", dot: "bg-blue-500" },
  contacted: { label: "Contacted", bg: "bg-purple-500/10 text-purple-500 border-purple-500/30", dot: "bg-purple-500" },
  consultation_scheduled: { label: "Consultation Scheduled", bg: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30", dot: "bg-indigo-500" },
  proposal_sent: { label: "Proposal Sent", bg: "bg-amber-500/10 text-amber-500 border-amber-500/30", dot: "bg-amber-500" },
  in_progress: { label: "In Progress", bg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30", dot: "bg-cyan-500" },
  closed_won: { label: "Closed Won", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", dot: "bg-emerald-500" },
  closed_lost: { label: "Closed Lost", bg: "bg-slate-500/10 text-slate-500 border-slate-500/30", dot: "bg-slate-400" },
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "consultation_scheduled", label: "Consultation Scheduled" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const SERVICE_OPTIONS = [
  "Living Room Interiors",
  "Bedroom Interiors",
  "Modular Kitchen",
  "Full Home Interiors",
  "Office & Commercial Interiors",
  "Other",
];

/* ─── COMPONENT ─────────────────────────────────────────────────────────────── */

export default function CrmInteriorEnquiries() {
  const { employee } = useCrmAuthStore();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0, new: 0, contacted: 0, consultation_scheduled: 0,
    proposal_sent: 0, in_progress: 0, closed_won: 0, closed_lost: 0,
  });
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected enquiry detail
  const [selectedItem, setSelectedItem] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigningEmp, setAssigningEmp] = useState(false);
  const [remarksInput, setRemarksInput] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);

  const isManagement = ["founder", "admin", "bdo", "team_lead"].includes(employee?.role);

  /* ── Data fetching ── */

  const fetchStats = useCallback(() => {
    api.get("/crm/interior-enquiries/stats")
      .then(({ data }) => setStats(data || {}))
      .catch(() => {});
  }, []);

  const fetchEnquiries = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (serviceFilter !== "all") params.service = serviceFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();

    api.get("/crm/interior-enquiries", { params })
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load interior enquiries"))
      .finally(() => setLoading(false));
  }, [statusFilter, serviceFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
    fetchEnquiries();
  }, [fetchStats, fetchEnquiries]);

  useEffect(() => {
    if (isManagement) {
      api.get("/crm/employees")
        .then(({ data }) => setEmployeesList(Array.isArray(data) ? data : data?.items || []))
        .catch(() => {});
    }
  }, [isManagement]);

  /* ── Interactions ── */

  const handleOpenDetail = (id) => {
    api.get(`/crm/interior-enquiries/${id}`)
      .then(({ data }) => {
        setSelectedItem(data);
        setRemarksInput(data.remarks || "");
        setFollowUpDate(data.follow_up_date ? data.follow_up_date.slice(0, 10) : "");
      })
      .catch(() => toast.error("Failed to load details"));
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedItem) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/crm/interior-enquiries/${selectedItem.id}`, { status: newStatus });
      toast.success(`Status updated to "${STATUS_BADGES[newStatus]?.label || newStatus}"`);
      setSelectedItem(prev => ({ ...prev, status: newStatus }));
      fetchStats();
      fetchEnquiries();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignChange = async (newAssigneeId) => {
    if (!selectedItem) return;
    setAssigningEmp(true);
    try {
      const { data } = await api.patch(`/crm/interior-enquiries/${selectedItem.id}/assign`, {
        assigned_to: newAssigneeId || null,
        follow_up_date: followUpDate || null,
      });
      toast.success("Assigned successfully");
      setSelectedItem(prev => ({
        ...prev,
        assigned_to: newAssigneeId,
        assigned_to_name: data.assigned_to_name,
      }));
      fetchEnquiries();
    } catch {
      toast.error("Failed to assign");
    } finally {
      setAssigningEmp(false);
    }
  };

  const handleSaveRemarks = async () => {
    if (!selectedItem) return;
    setSavingRemarks(true);
    try {
      await api.patch(`/crm/interior-enquiries/${selectedItem.id}`, {
        remarks: remarksInput,
        follow_up_date: followUpDate || null,
      });
      toast.success("Saved");
      setSelectedItem(prev => ({ ...prev, remarks: remarksInput, follow_up_date: followUpDate }));
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingRemarks(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  /* ── RENDER ── */

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[90rem] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Sofa className="w-7 h-7 text-vs-gold" />
            Interior Design Enquiries
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Special Services → Interior Designing — submissions from the public website.
          </p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchEnquiries(); }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { key: "total", label: "Total", color: "text-gray-700 dark:text-slate-200" },
          { key: "new", label: "New", color: "text-blue-600 dark:text-blue-400" },
          { key: "contacted", label: "Contacted", color: "text-purple-600 dark:text-purple-400" },
          { key: "consultation_scheduled", label: "Consultation", color: "text-indigo-600 dark:text-indigo-400" },
          { key: "proposal_sent", label: "Proposal Sent", color: "text-amber-600 dark:text-amber-400" },
          { key: "in_progress", label: "In Progress", color: "text-cyan-600 dark:text-cyan-400" },
          { key: "closed_won", label: "Closed Won", color: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ key, label, color }) => (
          <div
            key={key}
            onClick={() => setStatusFilter(key === "total" ? "all" : key)}
            className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-vs-gold/40 transition-colors"
          >
            <div className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</div>
            <div className={`text-2xl font-bold mt-1 ${color}`}>{stats[key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form
          onSubmit={e => { e.preventDefault(); fetchEnquiries(); }}
          className="relative w-full md:w-80"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, ID, city…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-vs-gold"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Service:</span>
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="all">All Services</option>
              {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-gray-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-vs-gold" /> Loading interior enquiries…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-12 space-y-3">
            <Sofa className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">No Enquiries Found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              No interior design enquiries match your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Enquiry ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Services</th>
                  <th className="p-3.5">Property</th>
                  <th className="p-3.5">Budget</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60 text-gray-700 dark:text-slate-200">
                {items.map((item) => {
                  const badge = STATUS_BADGES[item.status] || STATUS_BADGES.new;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(item.id)}
                    >
                      <td className="p-3.5 pl-5 font-mono font-semibold text-vs-gold">
                        {item.interior_enquiry_id}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{item.customer_name}</div>
                        <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3" /> {item.mobile}
                        </div>
                      </td>
                      <td className="p-3.5 max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {(item.services_required || []).slice(0, 2).map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-vs-gold/10 text-vs-gold text-[10px] font-medium">
                              {s.replace(" Interiors", "").replace(" & Commercial", "")}
                            </span>
                          ))}
                          {(item.services_required || []).length > 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 text-[10px]">
                              +{item.services_required.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div>{item.property_type || "—"}</div>
                        <div className="text-gray-500 dark:text-slate-400">{item.property_size || ""}</div>
                      </td>
                      <td className="p-3.5 text-gray-900 dark:text-slate-100">
                        {item.budget_range || "—"}
                      </td>
                      <td className="p-3.5">
                        <div>{item.city}</div>
                        <div className="text-gray-500 dark:text-slate-400 truncate max-w-[100px]">{item.area_locality}</div>
                      </td>
                      <td className="p-3.5 text-gray-500 dark:text-slate-400 text-[11px]">
                        {item.created_at ? formatDate(item.created_at) : "—"}
                      </td>
                      <td className="p-3.5 text-gray-600 dark:text-slate-400">
                        {item.assigned_to_name || "Unassigned"}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); handleOpenDetail(item.id); }}
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

      {/* ── DETAIL DRAWER ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-2 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-vs-gold">{selectedItem.interior_enquiry_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_BADGES[selectedItem.status]?.bg || ""}`}>
                    {STATUS_BADGES[selectedItem.status]?.label || selectedItem.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                  Interior Design Enquiry — {selectedItem.customer_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-gray-700 dark:text-slate-300">

              {/* Customer Info */}
              <DetailSection icon={<User className="w-4 h-4" />} title="Customer Information">
                <DetailGrid>
                  <DetailItem label="Name" value={selectedItem.customer_name} />
                  <DetailItem
                    label="Mobile"
                    value={
                      <span className="flex items-center gap-1.5">
                        {selectedItem.mobile}
                        {selectedItem.mobile_verified && (
                          <span className="text-emerald-500 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </span>
                    }
                  />
                  <DetailItem
                    label="Contact Consent"
                    value={
                      <span className={selectedItem.contact_consent ? "text-emerald-500" : "text-red-500"}>
                        {selectedItem.contact_consent ? "✓ Provided" : "✗ Not provided"}
                      </span>
                    }
                  />
                  <DetailItem label="OTP Ref" value={selectedItem.otp_verification_ref || "—"} />
                </DetailGrid>
              </DetailSection>

              {/* Services */}
              <DetailSection icon={<Sofa className="w-4 h-4" />} title="Services Required">
                <div className="flex flex-wrap gap-2">
                  {(selectedItem.services_required || []).map(s => (
                    <span key={s} className="px-3 py-1 rounded-full bg-vs-gold/10 border border-vs-gold/30 text-vs-gold text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </DetailSection>

              {/* Property */}
              <DetailSection icon={<Building2 className="w-4 h-4" />} title="Property Details">
                <DetailGrid>
                  <DetailItem label="Property Type" value={selectedItem.property_type} />
                  <DetailItem label="Size / BHK" value={selectedItem.property_size || "—"} />
                  <DetailItem label="Budget" value={selectedItem.budget_range} />
                </DetailGrid>
              </DetailSection>

              {/* Location */}
              <DetailSection icon={<MapPin className="w-4 h-4" />} title="Location">
                <DetailGrid>
                  <DetailItem label="City" value={selectedItem.city} />
                  <DetailItem label="Area / Locality" value={selectedItem.area_locality} />
                  {selectedItem.additional_address && (
                    <DetailItem label="Additional" value={selectedItem.additional_address} />
                  )}
                </DetailGrid>
              </DetailSection>

              {/* Uploaded files */}
              {(selectedItem.floor_plan_url || (selectedItem.reference_images || []).length > 0) && (
                <DetailSection icon={<FileImage className="w-4 h-4" />} title="Uploaded Files">
                  {selectedItem.floor_plan_url && (
                    <div className="text-xs">
                      <span className="text-gray-500 dark:text-slate-400">Floor Plan: </span>
                      <span className="text-vs-gold">{selectedItem.floor_plan_filename || selectedItem.floor_plan_url}</span>
                    </div>
                  )}
                  {(selectedItem.reference_images || []).length > 0 && (
                    <div className="text-xs">
                      <span className="text-gray-500 dark:text-slate-400">Reference Images: </span>
                      <span>{(selectedItem.reference_images || []).length} files uploaded</span>
                    </div>
                  )}
                </DetailSection>
              )}

              {/* CRM Controls */}
              <div className="p-4 rounded-xl bg-vs-gold/5 border border-vs-gold/20 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold">CRM Controls</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Update Status</label>
                    <select
                      value={selectedItem.status}
                      disabled={updatingStatus}
                      onChange={e => handleStatusChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-slate-100 outline-none"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign */}
                  {isManagement && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Assign To</label>
                      <select
                        value={selectedItem.assigned_to || ""}
                        disabled={assigningEmp}
                        onChange={e => handleAssignChange(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-slate-100 outline-none"
                      >
                        <option value="">-- Unassigned --</option>
                        {employeesList.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Follow-up date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-slate-100 outline-none"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Internal Remarks</label>
                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      value={remarksInput}
                      onChange={e => setRemarksInput(e.target.value)}
                      placeholder="Add follow-up notes, consultation date, proposal status…"
                      className="flex-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-slate-100 outline-none resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveRemarks}
                      disabled={savingRemarks}
                      className="px-3 py-2 bg-vs-gold text-vs-bg font-semibold rounded-lg text-xs hover:bg-amber-500 transition-colors self-end"
                    >
                      {savingRemarks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>

                {/* Meta */}
                <div className="pt-2 border-t border-vs-gold/20 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <span>Enquiry Date: <strong className="text-gray-800 dark:text-slate-200">{formatDate(selectedItem.created_at)}</strong></span>
                  <span>Source: <strong className="text-gray-800 dark:text-slate-200">{selectedItem.source || "website"}</strong></span>
                  {selectedItem.follow_up_date && (
                    <span>Follow-up: <strong className="text-vs-gold">{formatDate(selectedItem.follow_up_date)}</strong></span>
                  )}
                  {selectedItem.assigned_to_name && (
                    <span>Assigned: <strong className="text-gray-800 dark:text-slate-200">{selectedItem.assigned_to_name}</strong></span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── HELPERS ── */

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function DetailSection({ icon, title, children }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold flex items-center gap-1.5">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function DetailGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">{children}</div>;
}

function DetailItem({ label, value }) {
  return (
    <div>
      <span className="text-gray-500 dark:text-slate-400 block">{label}:</span>
      <strong className="text-gray-900 dark:text-slate-100">{value}</strong>
    </div>
  );
}
