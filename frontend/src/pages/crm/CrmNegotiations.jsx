import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { MessageSquare, Plus, Edit2, Clock, User, Phone, MapPin, Calendar, CheckCircle, AlertCircle, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "../../lib/crmPermissions";
import { useCrmAuthStore } from "../../store/crmAuthStore";

export default function CrmNegotiations() {
  const { employee } = useCrmAuthStore();
  const [negs, setNegs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNeg, setEditingNeg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    customer_id: "",
    status: "in_progress",
    seller_asking_price: "",
    buyer_offer: "",
    counter_offer: "",
    current_expected_price: "",
    notes: "",
    next_action: "",
    followup_date: "",
  });

  const isTeamLead = employee?.role === "team_lead";
  const canCreateOrEdit = isTeamLead;

  const fetchNegotiations = () => {
    setLoading(true);
    crmApi.get("/negotiations")
      .then((res) => setNegs(res.data))
      .catch(() => toast.error("Failed to load negotiations"))
      .finally(() => setLoading(false));
  };

  const fetchCustomers = () => {
    crmApi.get("/customers")
      .then((res) => setCustomers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCustomers([]));
  };

  useEffect(() => {
    fetchNegotiations();
    if (canCreateOrEdit) {
      fetchCustomers();
    }
  }, [employee, canCreateOrEdit]);

  const resetForm = () => {
    setForm({
      customer_id: "",
      status: "in_progress",
      seller_asking_price: "",
      buyer_offer: "",
      counter_offer: "",
      current_expected_price: "",
      notes: "",
      next_action: "",
      followup_date: "",
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (neg) => {
    setEditingNeg(neg);
    setForm({
      customer_id: neg.customer_id || "",
      status: neg.status || "in_progress",
      seller_asking_price: neg.seller_asking_price || "",
      buyer_offer: neg.buyer_offer || "",
      counter_offer: neg.counter_offer !== null && neg.counter_offer !== undefined ? neg.counter_offer : "",
      current_expected_price: neg.current_expected_price || "",
      notes: neg.notes || neg.remarks || "",
      next_action: neg.next_action || "",
      followup_date: neg.followup_date || neg.follow_up_date || "",
    });
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.error("Please select a customer");
      return;
    }
    setSubmitting(true);
    try {
      await crmApi.post("/negotiations", form);
      toast.success("Negotiation record created successfully");
      setShowAddModal(false);
      resetForm();
      fetchNegotiations();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create negotiation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingNeg) return;
    setSubmitting(true);
    try {
      await crmApi.put(`/negotiations/${editingNeg.id}`, form);
      toast.success("Negotiation record updated successfully");
      setShowEditModal(false);
      setEditingNeg(null);
      resetForm();
      fetchNegotiations();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update negotiation");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === form.customer_id);

  const getStatusBadge = (status) => {
    switch (status) {
      case "agreed":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">Agreed</span>;
      case "rejected":
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">Rejected</span>;
      case "on_hold":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">On Hold</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">In Progress</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Price Negotiations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track buyer offers, seller asking prices, counter offers, and negotiation history
          </p>
        </div>
        
        {/* NEW MANUAL ENTRY BUTTON — Available ONLY to Team Leaders */}
        {isTeamLead && (
          <button
            onClick={handleOpenAdd}
            data-testid="add-negotiation-btn"
            className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus size={16} />
            Add Negotiation / Manual Entry
          </button>
        )}
      </div>

      {/* List / Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw size={18} className="animate-spin text-orange-600" />
          Loading negotiation records...
        </div>
      ) : negs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <MessageSquare size={36} className="mx-auto text-gray-400" />
          <p className="text-base font-medium">No negotiation records found.</p>
          {isTeamLead && (
            <p className="text-xs text-gray-400">Click "Add Negotiation / Manual Entry" above to record a negotiation.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {negs.map((n) => {
            const isExpanded = expandedHistoryId === n.id;
            return (
              <div
                key={n.id}
                data-testid={`negotiation-card-${n.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4 transition-all hover:border-orange-300"
              >
                {/* Top header line */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    {n.customer_name ? (
                      <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100 text-base">
                        <User size={16} className="text-orange-600 shrink-0" />
                        {n.customer_name}
                      </div>
                    ) : n.deal_id ? (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded">
                        Deal: {n.deal_id}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-600">Customer Negotiation</span>
                    )}
                    {n.customer_phone && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Phone size={12} /> {n.customer_phone}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(n.status)}
                    {/* Edit button — ONLY for Team Leaders */}
                    {isTeamLead && (
                      <button
                        onClick={() => handleOpenEdit(n)}
                        data-testid={`edit-negotiation-${n.id}`}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit Negotiation"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Price Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-center text-xs border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-gray-400 font-medium">Seller Asking</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(n.seller_asking_price)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Buyer Offer</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(n.buyer_offer)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Expected</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(n.current_expected_price)}</p>
                  </div>
                </div>

                {/* Counter offer if present */}
                {n.counter_offer !== null && n.counter_offer !== undefined && n.counter_offer > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200/60 flex items-center justify-between">
                    <span>Counter Offer:</span>
                    <span className="font-bold">{formatCurrency(n.counter_offer)}</span>
                  </div>
                )}

                {/* Notes / Remarks */}
                {(n.notes || n.remarks) && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50/50 dark:bg-gray-900/50 p-2.5 rounded border border-gray-100 dark:border-gray-800">
                    "{n.notes || n.remarks}"
                  </p>
                )}

                {/* Next Action & Followup */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-gray-100 dark:border-gray-700 pt-3">
                  {n.next_action ? (
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      <span className="text-gray-400 font-normal">Next Action: </span>{n.next_action}
                    </div>
                  ) : <div />}

                  {(n.followup_date || n.follow_up_date) && (
                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                      <Calendar size={13} /> Followup: {n.followup_date || n.follow_up_date}
                    </div>
                  )}
                </div>

                {/* Metadata & Collapsible History */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                  <span>
                    Logged: {new Date(n.created_at).toLocaleDateString()}
                    {n.created_by_name && ` by ${n.created_by_name}`}
                  </span>

                  {Array.isArray(n.history) && n.history.length > 0 && (
                    <button
                      onClick={() => setExpandedHistoryId(isExpanded ? null : n.id)}
                      className="text-xs text-orange-600 dark:text-orange-400 font-medium hover:underline flex items-center gap-1"
                    >
                      <Clock size={12} />
                      History ({n.history.length})
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>

                {/* History Drawer */}
                {isExpanded && Array.isArray(n.history) && (
                  <div className="mt-2 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 space-y-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Negotiation Record History:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {n.history.map((h, idx) => (
                        <div key={idx} className="text-xs border-l-2 border-orange-400 pl-2 py-0.5 space-y-0.5">
                          <div className="flex items-center justify-between text-gray-500">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {h.performed_by_name || "Employee"} ({h.action || "update"})
                            </span>
                            <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                          </div>
                          {h.notes && <p className="text-gray-600 italic">"{h.notes}"</p>}
                          {h.changes && (
                            <div className="text-[11px] text-gray-500">
                              {Object.entries(h.changes).map(([k, v]) => (
                                <span key={k} className="mr-2">
                                  {k}: <strong className="text-gray-700 dark:text-gray-200">{String(v)}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          ADD NEGOTIATION MODAL — TEAM LEADERS ONLY
         ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plus size={18} className="text-orange-600" />
                Add Negotiation Record (Manual Entry)
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto" data-testid="add-negotiation-form">
              {/* Customer Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Customer *
                </label>
                <select
                  required
                  value={form.customer_id}
                  onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                  data-testid="select-customer-dropdown"
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">[ Select Customer ▼ ]</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Customer Info if selected */}
              {selectedCustomer && (
                <div className="p-3 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-orange-900 dark:text-orange-300">{selectedCustomer.name}</div>
                  <div className="text-gray-600 dark:text-gray-400">Phone: {selectedCustomer.phone || "N/A"}</div>
                  {selectedCustomer.email && <div className="text-gray-600 dark:text-gray-400">Email: {selectedCustomer.email}</div>}
                  {selectedCustomer.address && <div className="text-gray-600 dark:text-gray-400">Address: {selectedCustomer.address}</div>}
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="agreed">Agreed / Closed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Financial Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Seller Asking Price (INR)
                  </label>
                  <input
                    type="number"
                    value={form.seller_asking_price}
                    onChange={(e) => setForm((f) => ({ ...f, seller_asking_price: e.target.value }))}
                    placeholder="e.g. 7500000"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Buyer Offer (INR)
                  </label>
                  <input
                    type="number"
                    value={form.buyer_offer}
                    onChange={(e) => setForm((f) => ({ ...f, buyer_offer: e.target.value }))}
                    placeholder="e.g. 7000000"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Counter Offer (INR)
                  </label>
                  <input
                    type="number"
                    value={form.counter_offer}
                    onChange={(e) => setForm((f) => ({ ...f, counter_offer: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Current Expected Price (INR)
                  </label>
                  <input
                    type="number"
                    value={form.current_expected_price}
                    onChange={(e) => setForm((f) => ({ ...f, current_expected_price: e.target.value }))}
                    placeholder="e.g. 7200000"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Notes & Remarks */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Negotiation Details / Remarks
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Record what is happening with the customer..."
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* Next Action & Followup */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Next Action
                  </label>
                  <input
                    type="text"
                    value={form.next_action}
                    onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
                    placeholder="e.g. Call seller tomorrow"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={form.followup_date}
                    onChange={(e) => setForm((f) => ({ ...f, followup_date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="save-negotiation-submit"
                  className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT NEGOTIATION MODAL — TEAM LEADERS ONLY
         ======================================================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Edit2 size={18} className="text-orange-600" />
                Edit Negotiation Record
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="agreed">Agreed / Closed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Financial Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Seller Asking Price (INR)
                  </label>
                  <input
                    type="number"
                    value={form.seller_asking_price}
                    onChange={(e) => setForm((f) => ({ ...f, seller_asking_price: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Buyer Offer (INR)
                  </label>
                  <input
                    type="number"
                    value={form.buyer_offer}
                    onChange={(e) => setForm((f) => ({ ...f, buyer_offer: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Counter Offer (INR)
                  </label>
                  <input
                    type="number"
                    value={form.counter_offer}
                    onChange={(e) => setForm((f) => ({ ...f, counter_offer: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Current Expected Price (INR)
                  </label>
                  <input
                    type="number"
                    value={form.current_expected_price}
                    onChange={(e) => setForm((f) => ({ ...f, current_expected_price: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Notes & Remarks */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Update Negotiation Details / Remarks
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Update what is happening with the customer..."
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* Next Action & Followup */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Next Action
                  </label>
                  <input
                    type="text"
                    value={form.next_action}
                    onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={form.followup_date}
                    onChange={(e) => setForm((f) => ({ ...f, followup_date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="update-negotiation-submit"
                  className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
