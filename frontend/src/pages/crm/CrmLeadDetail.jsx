import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import { canAssignLeads, statusBadgeClass } from "../../lib/crmPermissions";
import toast from "react-hot-toast";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Clock, ChevronRight,
  Edit2, UserCheck, RefreshCw,
} from "lucide-react";

const STATUSES = [
  "new", "contacted", "qualified", "requirement_captured",
  "property_shared", "site_visit_planned", "site_visit_completed",
  "negotiation", "token", "agreement", "registration",
  "closed_won", "closed_lost", "follow_up_later",
];

function Timeline({ events }) {
  if (!events?.length) return (
    <p className="text-sm text-gray-400 text-center py-8">No activity yet.</p>
  );

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-5">
      {events.map((ev) => (
        <li key={ev.id || ev.timestamp} className="ml-6">
          <span className="absolute -left-2 flex items-center justify-center w-4 h-4 bg-blue-100 rounded-full ring-2 ring-white">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">{ev.action?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
            {ev.field && (
              <p className="text-xs text-gray-500 mt-0.5">
                {ev.field}: <span className="line-through text-red-400">{ev.old_value || "—"}</span>{" "}
                → <span className="text-green-600 font-medium">{ev.new_value || "—"}</span>
              </p>
            )}
            <time className="text-xs text-gray-400">
              {new Date(ev.timestamp).toLocaleString("en-IN")}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function CrmLeadDetail() {
  const { id } = useParams();
  const { employee } = useCrmAuthStore();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [employees, setEmployees] = useState([]);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const [leadRes, empRes] = await Promise.all([
        crmApi.get(`/leads/${id}`),
        crmApi.get("/employees"),
      ]);
      setLead(leadRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("You don't have permission to view this lead.");
      } else {
        toast.error("Failed to load lead");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await crmApi.patch(`/leads/${id}/status`, null, { params: { status: newStatus } });
      toast.success("Status updated");
      setLead((l) => ({ ...l, status: newStatus }));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!lead) return null;

  const cust = lead.customer;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/crm/leads" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Leads
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="font-semibold text-gray-900 font-mono">{lead.lead_id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Lead Info Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{cust?.name || "Unknown Customer"}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${statusBadgeClass(lead.status)}`}>
                  {lead.status?.replace("site_visit_planned", "Office Visit Planned").replace("site_visit_completed", "Office Visit Completed").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>
              <span className="font-mono text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                {lead.lead_id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5">
              {cust?.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" /> {cust.phone}
                </div>
              )}
              {cust?.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" /> {cust.email}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" /> Source: {lead.source}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" /> Registered: {new Date(lead.registered_date || lead.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>

            {lead.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={updatingStatus || lead.status === s}
                  onClick={() => updateStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    lead.status === s
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {s.replace("site_visit_planned", "Office Visit Planned").replace("site_visit_completed", "Office Visit Completed").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity Timeline</h2>
            <Timeline events={lead.timeline} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Customer Card */}
          {cust && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Customer</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {cust.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{cust.name}</p>
                  <p className="text-xs text-gray-500">{cust.phone}</p>
                </div>
              </div>
              <Link
                to={`/crm/customers/${cust.id}`}
                className="block text-center text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors"
              >
                View Customer Profile →
              </Link>
            </div>
          )}

          {/* Assignment */}
          {canAssignLeads(employee?.role) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Assignment</h2>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100"
                defaultValue={lead.assigned_to}
                onChange={async (e) => {
                  try {
                    await crmApi.patch(`/leads/${id}/assign`, null, { params: { assigned_to: e.target.value } });
                    toast.success("Lead reassigned");
                  } catch (err) {
                    toast.error(err.response?.data?.detail || "Failed to reassign");
                  }
                }}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
