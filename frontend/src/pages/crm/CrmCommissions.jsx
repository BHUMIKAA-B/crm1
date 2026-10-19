import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { DollarSign, Award, Plus, X, UserCheck } from "lucide-react";
import { formatCurrency, canSeeFinancials, canEnrollCommission } from "../../lib/crmPermissions";
import { useCrmAuthStore } from "../../store/crmAuthStore";

export default function CrmCommissions() {
  const { employee } = useCrmAuthStore();
  const [commSummary, setCommSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [executives, setExecutives] = useState([]);
  const [deals, setDeals] = useState([]);

  // Form
  const [executiveId, setExecutiveId] = useState("");
  const [dealId, setDealId] = useState("");
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [notes, setNotes] = useState("");

  const role = employee?.role;
  const canEnroll = canEnrollCommission(role);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/commissions");
      setCommSummary(res.data);

      if (canEnroll) {
        const [empRes, dealRes] = await Promise.all([
          crmApi.get("/employees"),
          crmApi.get("/deals"),
        ]);
        setExecutives(empRes.data || []);
        setDeals(dealRes.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load commission report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!executiveId || !dealId || !amount) {
      toast.error("Please select an Executive, Deal, and enter Commission Amount");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        executive_id: executiveId,
        deal_id: dealId,
        amount: parseFloat(amount),
        percentage: parseFloat(percentage || "0"),
        notes: notes.trim()
      };
      const res = await crmApi.post("/commissions", payload);
      toast.success(res.data?.message || "Commission enrolled successfully!");
      setExecutiveId(""); setDealId(""); setAmount(""); setPercentage(""); setNotes("");
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to enroll commission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commission & Payout Overview</h1>
          <p className="text-sm text-gray-500">
            {role === "team_lead"
              ? "Manage & enroll commissions for Executives in your team"
              : "Employee commission shares & company brokerage revenue"}
          </p>
        </div>
        {canEnroll && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Enroll Commission
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading commission metrics...</div>
      ) : !commSummary ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          Commission data restricted.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Employee Share</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(commSummary.total_employee_share)}</p>
            </div>
            {canSeeFinancials(role) && (
              <>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Expected Brokerage</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(commSummary.total_expected_commission)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Actual Realized</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(commSummary.total_actual_commission)}</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3">Enrolled Commissions & Deal Shares</h3>
            {commSummary.breakdown?.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No commissions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {commSummary.breakdown?.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 text-xs border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">
                        Deal: {b.deal_id} {b.executive_name ? `• Executive: ${b.executive_name}` : ""}
                      </p>
                      <p className="text-gray-500 mt-0.5">Status: <span className="font-semibold capitalize text-blue-600">{b.status}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">
                        {formatCurrency(b.amount ?? b.employee_commission_share)}
                      </p>
                      {b.actual_commission && <p className="text-gray-500">Actual Brokerage: {formatCurrency(b.actual_commission)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enroll Commission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Enroll Executive Commission</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Executive *</label>
                <select
                  required value={executiveId} onChange={(e) => setExecutiveId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="">Choose Executive...</option>
                  {executives.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - {emp.employee_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Deal *</label>
                <select
                  required value={dealId} onChange={(e) => setDealId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="">Choose Deal...</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id || d.deal_id}>
                      {d.deal_id} - Deal Value: {formatCurrency(d.final_deal_value)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Commission Amount (₹) *</label>
                  <input
                    type="number" required min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Share % (Optional)</label>
                  <input
                    type="number" step="0.1" min="0" max="100" value={percentage} onChange={(e) => setPercentage(e.target.value)}
                    placeholder="e.g. 10.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Commission notes, payout schedule..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? "Enrolling..." : "Save Commission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
