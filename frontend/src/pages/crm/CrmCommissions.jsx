import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { DollarSign, Award, TrendingUp } from "lucide-react";
import { formatCurrency, canSeeFinancials } from "../../lib/crmPermissions";
import { useCrmAuthStore } from "../../store/crmAuthStore";

export default function CrmCommissions() {
  const { employee } = useCrmAuthStore();
  const [commSummary, setCommSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = employee?.role;

  useEffect(() => {
    crmApi.get("/commissions")
      .then((res) => setCommSummary(res.data))
      .catch((err) => toast.error(err.response?.data?.detail || "Failed to load commission report"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commission & Payout Overview</h1>
        <p className="text-sm text-gray-500">Employee commission shares & company brokerage revenue</p>
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
              <p className="text-xs text-gray-500 font-semibold uppercase">My Employee Share</p>
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
            <h3 className="font-bold text-gray-900 mb-3">Deal Commission Breakdown</h3>
            <div className="space-y-2">
              {commSummary.breakdown?.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-xs">
                  <div>
                    <p className="font-bold text-gray-900">Deal: {b.deal_id}</p>
                    <p className="text-gray-500">Status: {b.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">Employee Share: {formatCurrency(b.employee_commission_share)}</p>
                    {b.actual_commission && <p className="text-gray-500">Actual Brokerage: {formatCurrency(b.actual_commission)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
