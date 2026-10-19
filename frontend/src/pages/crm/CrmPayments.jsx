import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { CreditCard, CheckCircle, Clock } from "lucide-react";
import { formatCurrency } from "../../lib/crmPermissions";

export default function CrmPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmApi.get("/payments")
      .then((res) => setPayments(res.data))
      .catch(() => toast.error("Failed to load payment records"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Schedule & Receipts</h1>
        <p className="text-sm text-gray-500">Track token advances, agreement payments, registration installments & commissions</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No payment records logged yet.
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                  {p.payment_type}
                </span>
                <p className="font-bold text-gray-900 text-lg mt-1">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-gray-500">Deal: {p.deal_id} · Due: {p.due_date}</p>
                {p.reference_no && <p className="text-xs text-gray-400">Ref: {p.reference_no}</p>}
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-lg uppercase ${
                p.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
