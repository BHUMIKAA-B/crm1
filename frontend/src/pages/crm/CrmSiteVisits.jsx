import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import {
  MapPin, Star, Plus, CheckCircle, XCircle, ExternalLink,
  Clock, RefreshCw, X, Calendar, User, FileText
} from "lucide-react";

const STATUS_OPTIONS = ["scheduled", "completed", "cancelled", "rescheduled"];
const STATUS_COLORS = {
  scheduled: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  rescheduled: "bg-amber-50 text-amber-700",
};

// ── Add Site Visit Modal ──────────────────────────────────────────────────
function AddSiteVisitModal({ onClose, onSuccess, employees, role }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    employee_id: "",
    date: today,
    time: "10:00",
    status: "scheduled",
    notes: "",
    visit_purpose: "",
    follow_up_date: "",
    next_action: "",
  });
  const [loading, setLoading] = useState(false);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Load customers for lookup
  useEffect(() => {
    crmApi.get("/customers").then((r) => setCustomers(r.data || [])).catch(() => {});
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) {
      toast.error("Date and time are required");
      return;
    }
    if (!useExistingCustomer && (!form.customer_name || !form.customer_phone)) {
      toast.error("Customer name and phone are required");
      return;
    }
    if (useExistingCustomer && !form.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    setLoading(true);
    try {
      const payload = useExistingCustomer
        ? { ...form }
        : { ...form, customer_id: undefined };
      await crmApi.post("/site-visits", payload);
      toast.success("Site visit created successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create site visit");
    } finally {
      setLoading(false);
    }
  };

  const canAssignToOthers = ["team_lead", "founder", "admin", "bdo"].includes(role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Add Site Visit</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Section */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Customer Details</p>
              <button
                type="button"
                onClick={() => {
                  setUseExistingCustomer(!useExistingCustomer);
                  setForm((f) => ({ ...f, customer_id: "", customer_name: "", customer_phone: "" }));
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
              >
                {useExistingCustomer ? "Enter new customer details" : "Select existing customer"}
              </button>
            </div>

            {useExistingCustomer ? (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Search Customer *</label>
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 mb-2"
                />
                <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                  {filteredCustomers.slice(0, 10).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setForm((f) => ({ ...f, customer_id: c.id })); setCustomerSearch(c.name); }}
                      className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                        form.customer_id === c.id ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-gray-50 text-gray-800"
                      }`}
                    >
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="text-xs text-gray-400 p-3 text-center">No customers found</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Name *</label>
                  <input
                    required={!useExistingCustomer}
                    value={form.customer_name}
                    onChange={set("customer_name")}
                    placeholder="Full name"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                  <input
                    required={!useExistingCustomer}
                    value={form.customer_phone}
                    onChange={set("customer_phone")}
                    placeholder="Phone number"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.customer_email}
                    onChange={set("customer_email")}
                    placeholder="Email (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Visit Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Visit Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={set("date")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Visit Time *</label>
              <input
                type="time"
                required
                value={form.time}
                onChange={set("time")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Visit Status</label>
              <select
                value={form.status}
                onChange={set("status")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={set("follow_up_date")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
          </div>

          {canAssignToOthers && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assign To (Employee)</label>
              <select
                value={form.employee_id}
                onChange={set("employee_id")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">— Self (you) —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Visit Purpose</label>
            <input
              value={form.visit_purpose}
              onChange={set("visit_purpose")}
              placeholder="e.g. Property inspection, Final site walk"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes / Remarks</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any special notes or instructions"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Next Action</label>
            <input
              value={form.next_action}
              onChange={set("next_action")}
              placeholder="e.g. Schedule negotiation with owner"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Create Site Visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Feedback Modal ───────────────────────────────────────────────────────
function FeedbackModal({ visit, onClose, onSuccess }) {
  const [form, setForm] = useState({
    interested: true,
    rating: 5,
    price_feedback: "",
    location_feedback: "",
    document_concerns: "",
    reason_for_rejection: "",
    next_action: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await crmApi.post(`/site-visits/${visit.id}/feedback`, form);
      toast.success("Site visit feedback submitted!");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Site Visit Feedback</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-xs text-gray-500">Customer: <strong>{visit.customer?.name}</strong></p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer Interested?</label>
            <select
              value={form.interested}
              onChange={(e) => setForm({ ...form, interested: e.target.value === "true" })}
              className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
            >
              <option value="true">YES — Interested</option>
              <option value="false">NO — Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rating (1 to 5)</label>
            <input
              type="number" min="1" max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })}
              className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Price Feedback</label>
            <input
              type="text" value={form.price_feedback}
              onChange={(e) => setForm({ ...form, price_feedback: e.target.value })}
              placeholder="e.g. Price is negotiable up to 1.4Cr"
              className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Next Recommended Action</label>
            <input
              type="text" value={form.next_action}
              onChange={(e) => setForm({ ...form, next_action: e.target.value })}
              placeholder="e.g. Schedule negotiation with owner"
              className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50">
              {loading ? "Saving…" : "Save Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function CrmSiteVisits() {
  const { employee } = useCrmAuthStore();
  const role = employee?.role;

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [feedbackVisit, setFeedbackVisit] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [employees, setEmployees] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus !== "all" ? { status: filterStatus } : {};
      const [visitsRes, empRes] = await Promise.all([
        crmApi.get("/site-visits", { params }),
        crmApi.get("/employees"),
      ]);
      setVisits(visitsRes.data);
      setEmployees(empRes.data);
    } catch {
      toast.error("Failed to load site visits");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statusFilters = ["all", "scheduled", "completed", "cancelled", "rescheduled"];

  return (
    <div className="space-y-6">
      {showAdd && (
        <AddSiteVisitModal
          onClose={() => setShowAdd(false)}
          onSuccess={fetchAll}
          employees={employees}
          role={role}
        />
      )}
      {feedbackVisit && (
        <FeedbackModal
          visit={feedbackVisit}
          onClose={() => setFeedbackVisit(null)}
          onSuccess={fetchAll}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Visits</h1>
          <p className="text-sm text-gray-500">Schedule, log and track customer site visits.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            id="btn-add-site-visit"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Site Visit
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-1 flex-wrap">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              filterStatus === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All Visits" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Visit Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-5 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center border border-gray-100">
          <MapPin className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-sm font-semibold text-gray-500">No site visits found</p>
          <p className="text-xs text-gray-400 mt-1">
            {filterStatus !== "all" ? `No ${filterStatus} visits.` : "Create your first site visit using the button above."}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 inline mr-1.5" /> Add Site Visit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visits.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                  {v.visit_id || "VS-SV"}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[v.status] || "bg-gray-50 text-gray-600"}`}>
                  {v.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900">{v.customer?.name || "Unknown Customer"}</h3>
                <p className="text-xs text-gray-500">{v.customer?.phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{v.date} at {v.time}</span>
                </div>
                {v.employee_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{v.employee_name}</span>
                  </div>
                )}
              </div>

              {v.visit_purpose && (
                <p className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                  <strong>Purpose:</strong> {v.visit_purpose}
                </p>
              )}

              {v.properties?.length > 0 && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg space-y-1">
                  <p className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Properties Visited</p>
                  {v.properties.map((propId, idx) => (
                    <Link
                      key={propId}
                      to={`/properties/${propId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {v.property_titles?.[idx] || propId}
                    </Link>
                  ))}
                </div>
              )}

              {v.notes && (
                <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg">{v.notes}</p>
              )}

              {v.next_action && (
                <p className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                  <strong>Next Action:</strong> {v.next_action}
                </p>
              )}

              {v.feedback ? (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800">Feedback Captured</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{v.feedback.rating}/5</span>
                    </div>
                  </div>
                  <p><strong>Interested:</strong> {v.feedback.interested ? "YES ✓" : "NO ✗"}</p>
                  {v.feedback.price_feedback && <p><strong>Price Note:</strong> {v.feedback.price_feedback}</p>}
                  {v.feedback.next_action && <p><strong>Next Action:</strong> {v.feedback.next_action}</p>}
                </div>
              ) : v.status !== "cancelled" ? (
                <button
                  onClick={() => setFeedbackVisit(v)}
                  className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Submit Site Visit Feedback
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
