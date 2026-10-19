import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Landmark, Search, Filter, RefreshCw, User, Phone, Mail, Building2,
  Calendar, FileText, CheckCircle2, Clock, AlertCircle, ArrowUpRight,
  UserCheck, Shield, ChevronRight, X, Loader2, ArrowRightLeft, DollarSign
} from "lucide-react";
import api from "@/api/client";
import { useCrmAuthStore } from "@/store/crmAuthStore";

const STATUS_BADGES = {
  new: { label: "New", bg: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  contacted: { label: "Contacted", bg: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  follow_up: { label: "Follow-up", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  in_progress: { label: "In Progress", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
  converted: { label: "Converted", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  closed: { label: "Closed", bg: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
};

export default function CrmLoanEnquiries() {
  const { employee } = useCrmAuthStore();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, follow_up: 0, in_progress: 0, converted: 0, closed: 0 });
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item detail modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigningEmp, setAssigningEmp] = useState(false);
  const [converting, setConverting] = useState(false);
  const [notesInput, setNotesInput] = useState("");

  const isManagement = ["founder", "admin", "bdo", "team_lead"].includes(employee?.role);

  const fetchStats = React.useCallback(() => {
    api.get("/crm/loan-enquiries/stats")
      .then(({ data }) => setStats(data || {}))
      .catch(() => {});
  }, []);

  const fetchEnquiries = React.useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (employmentFilter !== "all") params.employment_type = employmentFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();

    api.get("/crm/loan-enquiries", { params })
      .then(({ data }) => setItems(data || []))
      .catch(() => toast.error("Failed to load loan enquiries"))
      .finally(() => setLoading(false));
  }, [statusFilter, employmentFilter, searchQuery]);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEnquiries();
  };

  const handleOpenDetail = (id) => {
    api.get(`/crm/loan-enquiries/${id}`)
      .then(({ data }) => {
        setSelectedItem(data);
        setNotesInput(data.notes || "");
      })
      .catch(() => toast.error("Failed to load details"));
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedItem) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/crm/loan-enquiries/${selectedItem.id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setSelectedItem((prev) => ({ ...prev, status: newStatus }));
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
      const { data } = await api.patch(`/crm/loan-enquiries/${selectedItem.id}/assign`, { assigned_to: newAssigneeId });
      toast.success("Assigned successfully");
      setSelectedItem((prev) => ({
        ...prev,
        assigned_to: newAssigneeId,
        assigned_to_name: data.assigned_to_name
      }));
      fetchEnquiries();
    } catch {
      toast.error("Failed to assign");
    } finally {
      setAssigningEmp(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedItem) return;
    try {
      await api.patch(`/crm/loan-enquiries/${selectedItem.id}/status`, {
        status: selectedItem.status,
        notes: notesInput
      });
      toast.success("Notes saved");
      setSelectedItem((prev) => ({ ...prev, notes: notesInput }));
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const handleConvertToLead = async () => {
    if (!selectedItem) return;
    setConverting(true);
    try {
      const { data } = await api.post(`/crm/loan-enquiries/${selectedItem.id}/convert-to-lead`);
      toast.success(data.message || "Converted to Lead!");
      setSelectedItem((prev) => ({ ...prev, status: "converted" }));
      fetchStats();
      fetchEnquiries();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to convert to lead");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[90rem] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Landmark className="w-7 h-7 text-vs-gold" />
            Loan Enquiries
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Property financing and bank loan requests submitted from the public website.
          </p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchEnquiries(); }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{stats.total || 0}</div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-sm">
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
            <span>New</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.new || 0}</div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 shadow-sm">
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Contacted</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.contacted || 0}</div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.in_progress || 0}</div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Converted</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.converted || 0}</div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Closed</div>
          <div className="text-2xl font-bold text-gray-700 dark:text-slate-300 mt-1">{stats.closed || 0}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-vs-gold"
          />
        </form>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="follow_up">Follow-up</option>
              <option value="in_progress">In Progress</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Employment:</span>
            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Salaried">Salaried</option>
              <option value="Self-employed">Self-employed</option>
              <option value="Business">Business</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

      </div>

      {/* Loan Enquiries Data Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-gray-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-vs-gold" /> Loading loan enquiries...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-12 space-y-3">
            <Landmark className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">No Loan Enquiries Found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              No loan assistance submissions match your active filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Enquiry ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Property</th>
                  <th className="p-3.5">Loan Amount</th>
                  <th className="p-3.5">Employment</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Assigned To</th>
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
                        {item.loan_enquiry_id}
                      </td>
                      <td className="p-3.5 font-semibold text-gray-900 dark:text-slate-100">
                        {item.full_name}
                      </td>
                      <td className="p-3.5 space-y-0.5">
                        <div className="flex items-center gap-1 text-gray-800 dark:text-slate-200 font-medium">
                          <Phone className="w-3 h-3 text-gray-400" /> {item.phone}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-[150px]">
                          {item.email}
                        </div>
                      </td>
                      <td className="p-3.5 max-w-[180px]">
                        <div className="font-medium truncate text-gray-900 dark:text-slate-100">
                          {item.property_name || "General Financing"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                          {item.preferred_location || item.property_reference || "India"}
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-gray-900 dark:text-slate-100">
                        {item.loan_amount || "Not specified"}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium text-[11px]">
                          {item.employment_type || "Salaried"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-500 dark:text-slate-400 text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "N/A"}
                      </td>
                      <td className="p-3.5 text-gray-600 dark:text-slate-400">
                        {item.assigned_to_name || item.assigned_to || "Unassigned"}
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

      {/* DETAIL DRAWER / MODAL */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs p-2 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gray-50 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-vs-gold">{selectedItem.loan_enquiry_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_BADGES[selectedItem.status]?.bg || ""}`}>
                    {STATUS_BADGES[selectedItem.status]?.label || selectedItem.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                  Loan Enquiry — {selectedItem.full_name}
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
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700 dark:text-slate-300">
              
              {/* Customer Info Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Customer Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Name:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Phone:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.phone}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Email:</span>
                    <strong className="text-gray-900 dark:text-slate-100 truncate block">{selectedItem.email}</strong>
                  </div>
                </div>
              </div>

              {/* Property & Location */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> Property Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Property Name:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.property_name || "General Financing Enquiry"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Location:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.preferred_location || selectedItem.property_reference || "India"}</strong>
                  </div>
                </div>
              </div>

              {/* Loan Requirement Details */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Financing Requirements
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Loan Amount:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.loan_amount || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Property Value:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.property_value || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Employment:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.employment_type || "Salaried"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block">Monthly Income:</span>
                    <strong className="text-gray-900 dark:text-slate-100">{selectedItem.monthly_income_range || "N/A"}</strong>
                  </div>
                </div>
                {selectedItem.preferred_bank && (
                  <div className="text-xs pt-1">
                    <span className="text-gray-500 dark:text-slate-400">Preferred Bank: </span>
                    <strong className="text-vs-gold">{selectedItem.preferred_bank}</strong>
                  </div>
                )}
              </div>

              {/* Additional Message */}
              {selectedItem.message && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/80 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Customer Note / Requirements</span>
                  <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">{selectedItem.message}</p>
                </div>
              )}

              {/* Management Controls: Status, Assign, Lead Convert */}
              <div className="p-4 rounded-xl bg-vs-gold/5 border border-vs-gold/20 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-vs-gold">CRM Controls</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status update */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Update Status</label>
                    <select
                      value={selectedItem.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-slate-100 outline-none"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="in_progress">In Progress</option>
                      <option value="converted">Converted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {/* Employee Assignee */}
                  {isManagement && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Assigned Team Member</label>
                      <select
                        value={selectedItem.assigned_to || ""}
                        disabled={assigningEmp}
                        onChange={(e) => handleAssignChange(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-slate-100 outline-none"
                      >
                        <option value="">-- Unassigned --</option>
                        {employeesList.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Internal Notes</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Add follow-up notes or bank submission status..."
                      className="flex-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-slate-100 outline-none"
                    />
                    <button
                      onClick={handleSaveNotes}
                      className="px-3 py-1.5 bg-vs-gold text-vs-bg font-semibold rounded-lg text-xs hover:bg-amber-500 transition-colors"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>

                {/* Convert to Lead CTA */}
                <div className="pt-2 border-t border-vs-gold/20 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Convert customer into CRM pipeline:</span>
                  <button
                    onClick={handleConvertToLead}
                    disabled={converting || selectedItem.status === "converted"}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 shadow"
                  >
                    {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                    {selectedItem.status === "converted" ? "Already Converted to Lead" : "Convert to CRM Lead"}
                  </button>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
