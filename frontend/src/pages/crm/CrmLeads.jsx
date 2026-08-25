import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import { canAssignLeads, statusBadgeClass } from "../../lib/crmPermissions";
import toast from "react-hot-toast";
import {
  Plus, Search, Filter, RefreshCw, User, Phone, MapPin,
  ChevronDown, ChevronRight, X,
} from "lucide-react";

const SOURCES = [
  "Website", "Instagram", "Facebook", "Google", "WhatsApp",
  "Phone", "Walk-in", "Referral", "Broker", "Existing Customer",
  "Employee", "Property Portal", "Other",
];

const STATUSES = [
  "new", "contacted", "qualified", "requirement_captured",
  "property_shared", "site_visit_planned", "site_visit_completed",
  "negotiation", "token", "agreement", "registration",
  "closed_won", "closed_lost", "follow_up_later",
];

function StatusBadge({ status }) {
  const formatted = status
    ?.replace("site_visit_planned", "Office Visit Planned")
    ?.replace("site_visit_completed", "Office Visit Completed")
    ?.replace(/_/g, " ")
    ?.replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(status)}`}>
      {formatted}
    </span>
  );
}

function CreateLeadModal({ onClose, onSuccess, employees }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", source: "Website", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState(null);
  const { employee } = useCrmAuthStore();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await crmApi.post("/leads", {
        customer: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
        },
        source: form.source,
        notes: form.notes,
      });
      if (res.data.duplicate) {
        setDuplicate(res.data.existing);
      } else {
        toast.success(`Lead ${res.data.display_id} created`);
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {duplicate && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Possible duplicate detected</p>
            <p className="text-sm text-amber-700">
              Customer <strong>{duplicate.name}</strong> ({duplicate.phone}) already exists.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setDuplicate(null); onClose(); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Use Existing
              </button>
              <button
                onClick={() => setDuplicate(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Create Anyway
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer Name *</label>
              <input required value={form.name} onChange={set("name")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone *</label>
              <input required value={form.phone} onChange={set("phone")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={set("email")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lead Source *</label>
              <select required value={form.source} onChange={set("source")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white">
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
              <textarea rows={3} value={form.notes} onChange={set("notes")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? "Creating..." : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CrmLeads() {
  const { employee } = useCrmAuthStore();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [employees, setEmployees] = useState([]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await crmApi.get("/leads", { params });
      setLeads(res.data);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    crmApi.get("/employees").then((r) => setEmployees(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {showCreate && (
        <CreateLeadModal
          onClose={() => setShowCreate(false)}
          onSuccess={fetchLeads}
          employees={employees}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none appearance-none"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={fetchLeads}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/70">
              <tr>
                {["Lead ID", "Customer", "Source", "Status", "Assigned To", "Lead Registered Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No leads registered yet.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-blue-700">{lead.lead_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                          {lead.customer?.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{lead.customer?.name || "—"}</p>
                          <p className="text-xs text-gray-400">{lead.customer?.phone || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{lead.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {employees.find(e => e.id === lead.assigned_to)?.name || lead.employee_name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700">
                        {new Date(lead.registered_date || lead.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/crm/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
