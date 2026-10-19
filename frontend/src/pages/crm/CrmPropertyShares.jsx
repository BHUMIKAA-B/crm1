import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Share2, Building2 } from "lucide-react";

export default function CrmPropertyShares() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmApi.get("/property-shares")
      .then((res) => setShares(res.data))
      .catch(() => toast.error("Failed to load property shares log"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Sharing History</h1>
        <p className="text-sm text-gray-500">Record of properties presented to prospective buyers</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading history...</div>
      ) : shares.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No property sharing history logged yet.
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{s.customer?.name || "Customer"}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Shared <strong>{s.properties?.length || 0} properties</strong> on {new Date(s.date_shared).toLocaleDateString()}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 capitalize">
                {s.customer_response || "Pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
