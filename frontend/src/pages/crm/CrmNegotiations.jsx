import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { MessageSquare, ArrowRight } from "lucide-react";
import { formatCurrency } from "../../lib/crmPermissions";

export default function CrmNegotiations() {
  const [negs, setNegs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmApi.get("/negotiations")
      .then((res) => setNegs(res.data))
      .catch(() => toast.error("Failed to load negotiations"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Price Negotiations</h1>
        <p className="text-sm text-gray-500">Track buyer offers, seller asking prices, and counter offers</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading negotiations...</div>
      ) : negs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No negotiation entries recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {negs.map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  Deal: {n.deal_id}
                </span>
                <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg text-center text-xs">
                <div>
                  <p className="text-gray-400">Seller Asking</p>
                  <p className="font-bold text-gray-900 mt-1">{formatCurrency(n.seller_asking_price)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Buyer Offer</p>
                  <p className="font-bold text-blue-600 mt-1">{formatCurrency(n.buyer_offer)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Expected</p>
                  <p className="font-bold text-emerald-600 mt-1">{formatCurrency(n.current_expected_price)}</p>
                </div>
              </div>

              {n.notes && <p className="text-xs text-gray-600 italic">"{n.notes}"</p>}
              {n.next_action && <p className="text-xs font-semibold text-gray-800">Next Action: {n.next_action}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
