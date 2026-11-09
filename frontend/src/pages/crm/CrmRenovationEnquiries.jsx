import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Hammer,
  Search,
  Filter,
  RefreshCw,
  User,
  Phone,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  X,
  Loader2,
  MapPin,
  IndianRupee,
  FileText,
  Shield,
  Home,
  MessageSquare,
  UserCheck,
  Plus,
  Briefcase,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import crmApi from "@/api/crmClient";
import { useCrmAuthStore } from "@/store/crmAuthStore";

/* ─── STATUS CONFIG & WORKFLOW ────────────────────────────────────────────── */

const SEQUENTIAL_STATUSES = [
  "NEW",
  "CONTACTED",
  "REQUIREMENT VERIFIED",
  "SITE INSPECTION SCHEDULED",
  "SITE INSPECTION COMPLETED",
  "ESTIMATE SHARED",
  "NEGOTIATION",
  "APPROVED",
  "WORK SCHEDULED",
  "WORK IN PROGRESS",
  "COMPLETED",
];

const ADDITIONAL_STATUSES = [
  "NOT INTERESTED",
  "ON HOLD",
  "LOST",
  "CANCELLED",
];

const ALL_STATUSES = [...SEQUENTIAL_STATUSES, ...ADDITIONAL_STATUSES];

const STATUS_BADGES = {
  NEW: { label: "New", bg: "bg-blue-500/10 text-blue-600 border-blue-500/30", dot: "bg-blue-500" },
  CONTACTED: { label: "Contacted", bg: "bg-purple-500/10 text-purple-600 border-purple-500/30", dot: "bg-purple-500" },
  "REQUIREMENT VERIFIED": { label: "Requirement Verified", bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30", dot: "bg-indigo-500" },
  "SITE INSPECTION SCHEDULED": { label: "Inspection Scheduled", bg: "bg-amber-500/10 text-amber-600 border-amber-500/30", dot: "bg-amber-500" },
  "SITE INSPECTION COMPLETED": { label: "Inspection Completed", bg: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30", dot: "bg-cyan-500" },
  "ESTIMATE SHARED": { label: "Estimate Shared", bg: "bg-teal-500/10 text-teal-600 border-teal-500/30", dot: "bg-teal-500" },
  NEGOTIATION: { label: "Negotiation", bg: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", dot: "bg-yellow-500" },
  APPROVED: { label: "Approved", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", dot: "bg-emerald-500" },
  "WORK SCHEDULED": { label: "Work Scheduled", bg: "bg-sky-500/10 text-sky-600 border-sky-500/30", dot: "bg-sky-500" },
  "WORK IN PROGRESS": { label: "Work in Progress", bg: "bg-orange-500/10 text-orange-600 border-orange-500/30", dot: "bg-orange-500" },
  COMPLETED: { label: "Completed", bg: "bg-green-600/10 text-green-700 border-green-600/30", dot: "bg-green-600" },
  "NOT INTERESTED": { label: "Not Interested", bg: "bg-slate-500/10 text-slate-500 border-slate-500/30", dot: "bg-slate-400" },
  "ON HOLD": { label: "On Hold", bg: "bg-zinc-500/10 text-zinc-600 border-zinc-500/30", dot: "bg-zinc-400" },
  LOST: { label: "Lost", bg: "bg-rose-500/10 text-rose-600 border-rose-500/30", dot: "bg-rose-500" },
  CANCELLED: { label: "Cancelled", bg: "bg-red-500/10 text-red-600 border-red-500/30", dot: "bg-red-500" },
};

const SERVICE_OPTIONS = [
  "Complete Home Renovation",
  "Kitchen Renovation",
  "Bathroom Renovation",
  "Structural Alterations",
  "Flooring and Tiling",
  "Painting and Wall Improvements",
  "False Ceiling",
  "Other",
];

function formatCurrency(amount) {
  if (!amount && amount !== 0) return "—";
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return "₹" + num.toLocaleString("en-IN");
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export default function CrmRenovationEnquiries() {
  const { employee } = useCrmAuthStore();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    requirement_verified: 0,
    site_inspection_scheduled: 0,
    site_inspection_completed: 0,
    estimate_shared: 0,
    negotiation: 0,
    approved: 0,
    work_scheduled: 0,
    work_in_progress: 0,
    completed: 0,
    not_interested: 0,
    on_hold: 0,
    lost: 0,
    cancelled: 0,
  });

  const [employeesList, setEmployeesList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Action States in Modal
  const [newStatus, setNewStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [assignedExecutive, setAssignedExecutive] = useState("");
  const [assignedVendor, setAssignedVendor] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [savingAssignments, setSavingAssignments] = useState(false);

  const [estimatedQuote, setEstimatedQuote] = useState("");
  const [finalQuote, setFinalQuote] = useState("");
  const [quoteRemarks, setQuoteRemarks] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);

  const [remarkInput, setRemarkInput] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  // Add Vendor Modal
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    name: "",
    specialty: "",
    phone: "",
    email: "",
    city: "Bengaluru",
  });
  const [savingVendor, setSavingVendor] = useState(false);

  const isManagement = ["founder", "admin", "bdo", "team_lead"].includes(employee?.role);

  /* ── Fetching Data ── */

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await crmApi.get("/renovation-enquiries/stats");
      setStats(data || {});
    } catch {
      // stats error fallback
    }
  }, []);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (serviceFilter !== "all") params.service = serviceFilter;
      if (assignedFilter !== "all") params.assigned_to = assignedFilter;
      if (vendorFilter !== "all") params.assigned_vendor = vendorFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await crmApi.get("/renovation-enquiries", { params });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load renovation enquiries");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter, assignedFilter, vendorFilter, searchQuery]);

  const fetchVendors = useCallback(async () => {
    try {
      const { data } = await crmApi.get("/renovation-enquiries/vendors");
      setVendorsList(Array.isArray(data) ? data : []);
    } catch {
      // silently fallback
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await crmApi.get("/employees");
      setEmployeesList(Array.isArray(data) ? data : data?.items || []);
    } catch {
      // silently fallback
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchEnquiries();
    fetchVendors();
    if (isManagement) {
      fetchEmployees();
    }
  }, [fetchStats, fetchEnquiries, fetchVendors, fetchEmployees, isManagement]);

  // Load single enquiry details
  const openDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const { data } = await crmApi.get(`/renovation-enquiries/${id}`);
      setSelectedItem(data);
      setNewStatus(data.status || "NEW");
      setStatusRemarks("");
      setStatusReason("");
      setAssignedExecutive(data.assigned_to || "");
      setAssignedVendor(data.assigned_vendor_id || "");
      setFollowUpDate(data.follow_up_date || "");
      setEstimatedQuote(data.estimated_quotation ? String(data.estimated_quotation) : "");
      setFinalQuote(data.final_quotation ? String(data.final_quotation) : "");
      setQuoteRemarks(data.quotation_remarks || "");
    } catch {
      toast.error("Failed to load enquiry details");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Status Update Handler
  const handleUpdateStatus = async () => {
    if (!selectedItem) return;
    const isAdditional = ADDITIONAL_STATUSES.includes(newStatus);
    if (isAdditional && !statusReason.trim()) {
      toast.error(`Please provide a reason for setting status to "${newStatus}".`);
      return;
    }

    setUpdatingStatus(true);
    try {
      await crmApi.post(`/renovation-enquiries/${selectedItem.id}/status`, {
        status: newStatus,
        remarks: statusRemarks.trim(),
        reason: statusReason.trim(),
      });
      toast.success(`Status updated to ${newStatus}`);
      await openDetail(selectedItem.id);
      fetchStats();
      fetchEnquiries();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Assignment Handler (Executive & Vendor)
  const handleSaveAssignments = async () => {
    if (!selectedItem) return;
    setSavingAssignments(true);
    try {
      // 1. Assign Executive
      await crmApi.post(`/renovation-enquiries/${selectedItem.id}/assign-executive`, {
        assigned_to: assignedExecutive,
        follow_up_date: followUpDate || null,
      });

      // 2. Assign Vendor
      await crmApi.post(`/renovation-enquiries/${selectedItem.id}/assign-vendor`, {
        vendor_id: assignedVendor,
      });

      toast.success("Assignments updated successfully");
      await openDetail(selectedItem.id);
      fetchEnquiries();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save assignments");
    } finally {
      setSavingAssignments(false);
    }
  };

  // Quotation Save Handler
  const handleSaveQuote = async () => {
    if (!selectedItem) return;
    setSavingQuote(true);
    try {
      await crmApi.post(`/renovation-enquiries/${selectedItem.id}/quotation`, {
        estimated_quotation: estimatedQuote ? Number(estimatedQuote) : null,
        final_quotation: finalQuote ? Number(finalQuote) : null,
        remarks: quoteRemarks.trim(),
      });
      toast.success("Quotation information saved");
      await openDetail(selectedItem.id);
      fetchEnquiries();
    } catch (err) {
      toast.error("Failed to update quotation");
    } finally {
      setSavingQuote(false);
    }
  };

  // Add Internal Remark Handler
  const handleAddRemark = async () => {
    if (!selectedItem || !remarkInput.trim()) return;
    setSavingRemark(true);
    try {
      await crmApi.post(`/renovation-enquiries/${selectedItem.id}/remarks`, {
        remark: remarkInput.trim(),
      });
      toast.success("Remark added");
      setRemarkInput("");
      await openDetail(selectedItem.id);
      fetchEnquiries();
    } catch {
      toast.error("Failed to add remark");
    } finally {
      setSavingRemark(false);
    }
  };

  // Add New Vendor Partner Handler
  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!newVendorForm.name.trim() || !newVendorForm.specialty.trim() || !newVendorForm.phone.trim()) {
      toast.error("Name, specialty, and phone are mandatory.");
      return;
    }

    setSavingVendor(true);
    try {
      const { data } = await crmApi.post("/renovation-enquiries/vendors", newVendorForm);
      toast.success(`Partner vendor "${data.name}" added`);
      await fetchVendors();
      setAssignedVendor(data.id);
      setShowAddVendor(false);
      setNewVendorForm({ name: "", specialty: "", phone: "", email: "", city: "Bengaluru" });
    } catch (err) {
      toast.error("Failed to add vendor partner");
    } finally {
      setSavingVendor(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[96rem] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
                Renovation & Alteration Services
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Special Services → Renovation / Alteration Enquiries & Execution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isManagement && (
            <button
              type="button"
              onClick={() => setShowAddVendor(true)}
              className="px-3.5 py-2 rounded-lg border border-vs-border bg-vs-surface hover:bg-vs-bg text-sm font-medium text-vs-text-primary flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              Add Vendor Partner
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchEnquiries();
              fetchVendors();
            }}
            className="px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-3.5 rounded-xl border bg-vs-surface cursor-pointer transition-all ${
            statusFilter === "all" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-vs-border"
          }`}
        >
          <span className="text-[11px] font-semibold text-vs-text-secondary uppercase block">
            Total Enquiries
          </span>
          <span className="text-xl font-bold text-vs-text-primary mt-1 block">
            {stats.total || 0}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("NEW")}
          className={`p-3.5 rounded-xl border bg-vs-surface cursor-pointer transition-all ${
            statusFilter === "NEW" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-vs-border"
          }`}
        >
          <span className="text-[11px] font-semibold text-blue-600 uppercase block">New</span>
          <span className="text-xl font-bold text-blue-600 mt-1 block">{stats.new || 0}</span>
        </div>

        <div
          onClick={() => setStatusFilter("CONTACTED")}
          className={`p-3.5 rounded-xl border bg-vs-surface cursor-pointer transition-all ${
            statusFilter === "CONTACTED"
              ? "border-purple-500 ring-2 ring-purple-500/20"
              : "border-vs-border"
          }`}
        >
          <span className="text-[11px] font-semibold text-purple-600 uppercase block">
            Contacted
          </span>
          <span className="text-xl font-bold text-purple-600 mt-1 block">
            {stats.contacted || 0}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("SITE INSPECTION SCHEDULED")}
          className={`p-3.5 rounded-xl border bg-vs-surface cursor-pointer transition-all ${
            statusFilter === "SITE INSPECTION SCHEDULED"
              ? "border-amber-500 ring-2 ring-amber-500/20"
              : "border-vs-border"
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-600 uppercase block">
            Inspection
          </span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">
            {(stats.site_inspection_scheduled || 0) + (stats.site_inspection_completed || 0)}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("ESTIMATE SHARED")}
          className={`p-3.5 rounded-xl border bg-vs-surface cursor-pointer transition-all ${
            statusFilter === "ESTIMATE SHARED"
              ? "border-teal-500 ring-2 ring-teal-500/20"
              : "border-vs-border"
          }`}
        >
          <span className="text-[11px] font-semibold text-teal-600 uppercase block">
            Estimate Shared
          </span>
          <span className="text-xl font-bold text-teal-600 mt-1 block">
            {stats.estimate_shared || 0}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("WORK IN PROGRESS")}
          className={`p-3.5 rounded-xl border bg-vs-surface cursor-pointer transition-all ${
            statusFilter === "WORK IN PROGRESS"
              ? "border-orange-500 ring-2 ring-orange-500/20"
              : "border-vs-border"
          }`}
        >
          <span className="text-[11px] font-semibold text-orange-600 uppercase block">
            In Progress
          </span>
          <span className="text-xl font-bold text-orange-600 mt-1 block">
            {stats.work_in_progress || 0}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("COMPLETED")}
          className={`p-3.5 rounded-xl border bg-vs-surface cursor-pointer transition-all ${
            statusFilter === "COMPLETED"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-vs-border"
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-600 uppercase block">
            Completed
          </span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">
            {stats.completed || 0}
          </span>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-vs-border bg-vs-surface space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-vs-text-muted absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, mobile, email, enquiry ID, city, or locality..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-vs-border bg-vs-bg text-sm text-vs-text-primary focus:outline-none focus:ring-2 focus:ring-vs-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-xs font-medium text-vs-text-primary"
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Service Category Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-xs font-medium text-vs-text-primary"
            >
              <option value="all">All Categories</option>
              {SERVICE_OPTIONS.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>

            {/* Assigned Executive Filter */}
            {isManagement && (
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-xs font-medium text-vs-text-primary"
              >
                <option value="all">All Executives</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            )}

            {/* Assigned Vendor Filter */}
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-xs font-medium text-vs-text-primary"
            >
              <option value="all">All Vendors</option>
              {vendorsList.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── ENQUIRIES TABLE ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-vs-border bg-vs-surface overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-vs-text-secondary">
            <Loader2 className="w-6 h-6 animate-spin text-vs-gold" />
            <span className="text-sm">Loading renovation enquiries...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-2 text-vs-text-secondary">
            <Hammer className="w-10 h-10 text-vs-text-muted/50" />
            <p className="text-base font-semibold text-vs-text-primary">No renovation enquiries found</p>
            <p className="text-xs max-w-sm">
              Enquiries submitted through the website or matching your active filters will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-vs-bg/80 border-b border-vs-border text-[11px] font-semibold text-vs-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Enquiry ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4">Executive</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Quotations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vs-border">
                {items.map((item) => {
                  const statusKey = (item.status || "NEW").toUpperCase();
                  const badge = STATUS_BADGES[statusKey] || STATUS_BADGES["NEW"];

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-vs-bg/60 transition-colors cursor-pointer group"
                      onClick={() => openDetail(item.id)}
                    >
                      {/* Enquiry ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        {item.renovation_enquiry_id || "VS-REN-NEW"}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-vs-text-primary">{item.customer_name}</div>
                        <div className="text-xs text-vs-text-secondary flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-vs-text-muted" />
                          +91 {item.mobile}
                        </div>
                      </td>

                      {/* Services Required */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px] truncate font-medium text-vs-text-primary">
                          {(item.services_required || []).join(", ")}
                        </div>
                        <div className="text-[11px] text-vs-text-secondary mt-0.5">
                          Scope: {item.renovation_scope || "—"}
                        </div>
                      </td>

                      {/* Property Type & Size */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-vs-text-primary">
                          {item.property_type || "—"}
                        </div>
                        <div className="text-[11px] text-vs-text-secondary">
                          {item.property_size || ""}{" "}
                          {item.commercial_area ? `(${item.commercial_area})` : ""}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-vs-text-primary">{item.area_locality}</div>
                        <div className="text-[11px] text-vs-text-secondary">{item.city}</div>
                      </td>

                      {/* Budget */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-vs-text-primary">
                        {item.budget_range || "—"}
                      </td>

                      {/* Timeline */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-vs-text-secondary">
                        {item.expected_start_date || "—"}
                      </td>

                      {/* Assigned Executive */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.assigned_to_name ? (
                          <span className="inline-flex items-center gap-1 font-medium text-vs-text-primary">
                            <UserCheck className="w-3.5 h-3.5 text-vs-gold" />
                            {item.assigned_to_name}
                          </span>
                        ) : (
                          <span className="text-vs-text-muted italic">Unassigned</span>
                        )}
                        {item.follow_up_date && (
                          <div className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {item.follow_up_date}
                          </div>
                        )}
                      </td>

                      {/* Assigned Vendor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.assigned_vendor_name ? (
                          <span className="inline-flex items-center gap-1 font-medium text-vs-text-primary">
                            <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                            <span className="max-w-[140px] truncate">
                              {item.assigned_vendor_name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-vs-text-muted italic">Not Assigned</span>
                        )}
                      </td>

                      {/* Quotations */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.final_quotation ? (
                          <div>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(item.final_quotation)}
                            </span>
                            <span className="text-[10px] text-vs-text-muted block">Final</span>
                          </div>
                        ) : item.estimated_quotation ? (
                          <div>
                            <span className="font-medium text-amber-600">
                              {formatCurrency(item.estimated_quotation)}
                            </span>
                            <span className="text-[10px] text-vs-text-muted block">Estimate</span>
                          </div>
                        ) : (
                          <span className="text-vs-text-muted">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(item.id);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-vs-border bg-vs-surface hover:bg-vs-bg text-xs font-medium text-vs-text-primary shadow-sm"
                        >
                          Manage
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

      {/* ── DETAIL & WORKFLOW MODAL ────────────────────────────────────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-vs-surface border border-vs-border rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-vs-border flex items-start justify-between gap-4 bg-vs-bg/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                    {selectedItem.renovation_enquiry_id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                      (STATUS_BADGES[selectedItem.status] || STATUS_BADGES["NEW"]).bg
                    }`}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-vs-text-primary mt-1">
                  {selectedItem.customer_name} &bull; {selectedItem.property_type} (
                  {selectedItem.property_size})
                </h2>
                <p className="text-xs text-vs-text-secondary mt-0.5">
                  Submitted on {formatDateTime(selectedItem.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg hover:bg-vs-border text-vs-text-muted hover:text-vs-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Top Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Card */}
                <div className="p-4 rounded-xl border border-vs-border bg-vs-bg/50 space-y-2 text-xs">
                  <h4 className="font-semibold text-vs-text-primary text-sm flex items-center gap-1.5 border-b border-vs-border/60 pb-1.5">
                    <User className="w-4 h-4 text-vs-gold" /> Customer Information
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Full Name:</span>
                    <strong className="text-vs-text-primary">{selectedItem.customer_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Mobile:</span>
                    <strong className="text-vs-text-primary font-mono">
                      +91 {selectedItem.mobile}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Email:</span>
                    <strong className="text-vs-text-primary">
                      {selectedItem.email || "Not Provided"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Location:</span>
                    <strong className="text-vs-text-primary">
                      {selectedItem.area_locality}, {selectedItem.city}
                    </strong>
                  </div>
                  {selectedItem.additional_address && (
                    <div className="pt-1 text-vs-text-secondary">
                      Address: {selectedItem.additional_address}
                    </div>
                  )}
                </div>

                {/* Property & Requirement Card */}
                <div className="p-4 rounded-xl border border-vs-border bg-vs-bg/50 space-y-2 text-xs">
                  <h4 className="font-semibold text-vs-text-primary text-sm flex items-center gap-1.5 border-b border-vs-border/60 pb-1.5">
                    <Home className="w-4 h-4 text-vs-gold" /> Property & Scope
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Property Type:</span>
                    <strong className="text-vs-text-primary">
                      {selectedItem.property_type} &bull; {selectedItem.property_size}
                    </strong>
                  </div>
                  {selectedItem.commercial_area && (
                    <div className="flex justify-between">
                      <span className="text-vs-text-secondary">Commercial Area:</span>
                      <strong className="text-vs-text-primary">{selectedItem.commercial_area}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Current Condition:</span>
                    <strong className="text-vs-text-primary">
                      {selectedItem.property_condition}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Renovation Scope:</span>
                    <strong className="text-vs-text-primary">{selectedItem.renovation_scope}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Budget Range:</span>
                    <strong className="text-amber-600 dark:text-amber-400">
                      {selectedItem.budget_range}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vs-text-secondary">Expected Start:</span>
                    <strong className="text-vs-text-primary">
                      {selectedItem.expected_start_date}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Services Selected */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-vs-text-secondary uppercase tracking-wider block">
                  Requested Services
                </span>
                <div className="flex flex-wrap gap-2">
                  {(selectedItem.services_required || []).map((srv) => (
                    <span
                      key={srv}
                      className="px-3 py-1 rounded-lg border border-vs-border bg-vs-bg text-xs font-medium text-vs-text-primary"
                    >
                      {srv}
                    </span>
                  ))}
                </div>
              </div>

              {/* Requirement Description if present */}
              {selectedItem.requirement_description && (
                <div className="p-3.5 rounded-xl border border-vs-border bg-vs-bg/30 text-xs space-y-1">
                  <span className="font-semibold text-vs-text-primary block">
                    Customer Note / Requirement Description:
                  </span>
                  <p className="text-vs-text-secondary leading-relaxed">
                    {selectedItem.requirement_description}
                  </p>
                </div>
              )}

              {/* Uploaded Files if present */}
              {selectedItem.uploaded_files && selectedItem.uploaded_files.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-vs-text-secondary uppercase tracking-wider block">
                    Uploaded Photos / Floor Plans ({selectedItem.uploaded_files.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedItem.uploaded_files.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-vs-border bg-vs-bg flex items-center gap-2 text-xs"
                      >
                        <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                        <div className="truncate flex-1">
                          <p className="font-medium text-vs-text-primary truncate">
                            {file.filename || file.name || `File ${idx + 1}`}
                          </p>
                          <span className="text-[10px] text-vs-text-secondary block">
                            {file.size_label || ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 1. STATUS WORKFLOW UPDATE ─────────────────────────────── */}
              <div className="p-4 rounded-xl border border-vs-border bg-vs-bg/40 space-y-3">
                <h4 className="font-semibold text-sm text-vs-text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-vs-gold" /> Update Enquiry Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary font-medium"
                    >
                      <optgroup label="Primary Sequential Workflow">
                        {SEQUENTIAL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Additional Terminal Statuses">
                        {ADDITIONAL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                      Status Transition Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={statusRemarks}
                      onChange={(e) => setStatusRemarks(e.target.value)}
                      placeholder="e.g. Completed site survey, measurements noted"
                      className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary"
                    />
                  </div>
                </div>

                {/* If additional status selected, require mandatory reason */}
                {ADDITIONAL_STATUSES.includes(newStatus) && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                    <label className="block text-xs font-semibold text-red-600">
                      Reason for {newStatus} (Mandatory) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="State reason: client budget mismatch, postponed, lost to competitor, etc."
                      className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-900 bg-vs-surface text-sm text-vs-text-primary"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || newStatus === selectedItem.status}
                    className="px-4 py-2 rounded-lg bg-vs-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Update Status
                  </button>
                </div>
              </div>

              {/* ── 2. EXECUTIVE & VENDOR ASSIGNMENTS ──────────────────────── */}
              <div className="p-4 rounded-xl border border-vs-border bg-vs-bg/40 space-y-3">
                <h4 className="font-semibold text-sm text-vs-text-primary flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-vs-gold" /> Assignments & Follow-Up
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                      Assigned Executive
                    </label>
                    <select
                      value={assignedExecutive}
                      onChange={(e) => setAssignedExecutive(e.target.value)}
                      disabled={!isManagement}
                      className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary disabled:opacity-60"
                    >
                      <option value="">Unassigned</option>
                      {employeesList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                      Assigned Partner Vendor
                    </label>
                    <select
                      value={assignedVendor}
                      onChange={(e) => setAssignedVendor(e.target.value)}
                      disabled={!isManagement}
                      className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary disabled:opacity-60"
                    >
                      <option value="">Not Assigned</option>
                      {vendorsList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAssignments}
                    disabled={savingAssignments}
                    className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingAssignments && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Assignments
                  </button>
                </div>
              </div>

              {/* ── 3. QUOTATION MANAGEMENT ───────────────────────────────── */}
              <div className="p-4 rounded-xl border border-vs-border bg-vs-bg/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-vs-text-primary flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-emerald-600" /> Quotation Management
                  </h4>
                  {selectedItem.quotation_updated_at && (
                    <span className="text-[11px] text-vs-text-muted">
                      Updated by {selectedItem.quotation_updated_by} on{" "}
                      {formatDate(selectedItem.quotation_updated_at)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                      Estimated Quotation (INR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-semibold text-vs-text-muted">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={estimatedQuote}
                        onChange={(e) => setEstimatedQuote(e.target.value)}
                        placeholder="e.g. 500000"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                      Final Agreed Quotation (INR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-semibold text-vs-text-muted">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={finalQuote}
                        onChange={(e) => setFinalQuote(e.target.value)}
                        placeholder="e.g. 480000"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                    Quotation Remarks / Scope Inclusions
                  </label>
                  <input
                    type="text"
                    value={quoteRemarks}
                    onChange={(e) => setQuoteRemarks(e.target.value)}
                    placeholder="e.g. Includes GST, Italian marble tiling, false ceiling with warm LEDs"
                    className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm text-vs-text-primary"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveQuote}
                    disabled={savingQuote}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingQuote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Quotations
                  </button>
                </div>
              </div>

              {/* ── 4. STATUS HISTORY AUDIT LOG ────────────────────────────── */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-vs-text-secondary uppercase tracking-wider block">
                  Status History & Transitions
                </span>
                <div className="rounded-xl border border-vs-border bg-vs-bg divide-y divide-vs-border text-xs max-h-48 overflow-y-auto">
                  {(selectedItem.status_history || []).length === 0 ? (
                    <div className="p-4 text-center text-vs-text-muted">No transition logs yet</div>
                  ) : (
                    selectedItem.status_history.map((log, i) => (
                      <div key={i} className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-vs-text-primary flex items-center gap-1.5">
                            {log.previous_status ? (
                              <>
                                <span className="text-vs-text-muted">{log.previous_status}</span>
                                <span className="text-vs-gold">→</span>
                              </>
                            ) : null}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {log.new_status}
                            </span>
                          </div>
                          <span className="text-[11px] text-vs-text-muted">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        <div className="text-[11px] text-vs-text-secondary">
                          Updated by: <strong className="text-vs-text-primary">{log.updated_by}</strong>
                        </div>
                        {log.remarks && (
                          <div className="text-vs-text-secondary italic">Remarks: {log.remarks}</div>
                        )}
                        {log.reason && (
                          <div className="text-red-500 font-medium">Reason: {log.reason}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── 5. INTERNAL REMARKS & NOTES ────────────────────────────── */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-vs-text-secondary uppercase tracking-wider block">
                  Internal Remarks & Team Notes
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={remarkInput}
                    onChange={(e) => setRemarkInput(e.target.value)}
                    placeholder="Add an internal note about client conversation, site visit feedback..."
                    className="flex-1 px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-sm text-vs-text-primary focus:outline-none focus:ring-2 focus:ring-vs-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddRemark}
                    disabled={savingRemark || !remarkInput.trim()}
                    className="px-4 py-2 rounded-lg bg-vs-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                  >
                    {savingRemark && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Add Note
                  </button>
                </div>

                {/* Notes History */}
                {selectedItem.internal_notes && selectedItem.internal_notes.length > 0 && (
                  <div className="rounded-xl border border-vs-border bg-vs-bg p-3 space-y-2 text-xs max-h-40 overflow-y-auto">
                    {selectedItem.internal_notes.map((n, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-vs-surface border border-vs-border/60 space-y-0.5"
                      >
                        <div className="flex justify-between text-[11px] text-vs-text-muted">
                          <strong>{n.author}</strong>
                          <span>{formatDateTime(n.created_at)}</span>
                        </div>
                        <p className="text-vs-text-primary">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-vs-border flex justify-end bg-vs-bg/50">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 rounded-xl bg-vs-primary text-white text-sm font-medium hover:opacity-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD VENDOR PARTNER MODAL ───────────────────────────────────────── */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-vs-surface border border-vs-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-vs-border pb-3">
              <h3 className="font-bold text-base text-vs-text-primary flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-600" /> Add Renovation Partner Vendor
              </h3>
              <button
                type="button"
                onClick={() => setShowAddVendor(false)}
                className="p-1 rounded-lg hover:bg-vs-border text-vs-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-vs-text-primary mb-1">
                  Vendor / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newVendorForm.name}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Apex Civil & Interior Solutions"
                  className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-vs-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-vs-text-primary mb-1">
                  Specialty / Scope *
                </label>
                <input
                  type="text"
                  required
                  value={newVendorForm.specialty}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, specialty: e.target.value }))
                  }
                  placeholder="e.g. Kitchen, Flooring, Civil Demolition"
                  className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-vs-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-vs-text-primary mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={newVendorForm.phone}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-vs-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-vs-text-primary mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={newVendorForm.email}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="partners@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-vs-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-vs-text-primary mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={newVendorForm.city}
                  onChange={(e) =>
                    setNewVendorForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-vs-border bg-vs-bg text-vs-text-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddVendor(false)}
                  className="px-4 py-2 rounded-lg border border-vs-border text-vs-text-primary hover:bg-vs-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVendor}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 flex items-center gap-1.5"
                >
                  {savingVendor && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
