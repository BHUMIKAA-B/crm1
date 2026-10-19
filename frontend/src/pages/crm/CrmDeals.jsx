import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Handshake, DollarSign, ShieldAlert, CheckCircle2 } from "lucide-react";
import { formatCurrency, canSeeFinancials } from "../../lib/crmPermissions";
import { useCrmAuthStore } from "../../store/crmAuthStore";

export default function CrmDeals() {
  const { employee } = useCrmAuthStore();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = employee?.role;

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/deals");
      setDeals(res.data);
    } catch {
      toast.error("Failed to load deals pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleStatusChange = async (dealId, status) => {
    try {
      await crmApi.patch(`/deals/${dealId}/status`, { status });
      toast.success("Deal status updated");
      fetchDeals();
    } catch {
      toast.error("Failed to update deal status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals Pipeline</h1>
          <p className="text-sm text-gray-500">Track deal progress from negotiation to registration and commission payout</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading deals...</div>
      ) : deals.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No active deals in pipeline.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {d.deal_id || "VS-DEAL"}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">
                  {d.status}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-400">Deal Value</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {d.final_deal_value ? formatCurrency(d.final_deal_value) : "Restricted (RBAC)"}
                </p>
              </div>

              <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
                <p><strong>Customer:</strong> {d.customer?.name || d.customer_id}</p>
                <p><strong>Property:</strong> <Link to={`/properties/${d.property_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">{d.property?.title || d.property_id}</Link></p>
                {d.employee_commission_share !== undefined && d.employee_commission_share !== null && (
                  <p className="text-emerald-700 font-semibold">
                    <strong>My Share:</strong> {formatCurrency(d.employee_commission_share)}
                  </p>
                )}
                {!canSeeFinancials(role) && d.actual_commission === null && (
                  <p className="text-xs text-amber-600 italic">Company financials hidden by role permissions</p>
                )}
              </div>

              {/* Status change dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Update Pipeline Stage</label>
                <select
                  value={d.status}
                  onChange={(e) => handleStatusChange(d.id, e.target.value)}
                  className="w-full text-xs font-medium border border-gray-200 rounded-lg p-2 bg-white outline-none"
                >
                  <option value="negotiation">Negotiation</option>
                  <option value="token_received">Token Received</option>
                  <option value="agreement_done">Agreement Done</option>
                  <option value="registration_done">Registration Done</option>
                  <option value="closed">Closed Won</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
