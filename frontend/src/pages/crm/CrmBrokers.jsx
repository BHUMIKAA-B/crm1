import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Building, Phone, Star } from "lucide-react";

export default function CrmBrokers() {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBrokers = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/brokers");
      setBrokers(res.data);
    } catch {
      toast.error("Failed to load brokers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokers & Channel Partners</h1>
          <p className="text-sm text-gray-500">Channel Partner Directory & Performance Ratings</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading brokers...</div>
      ) : brokers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No brokers recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brokers.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  {b.broker_id}
                </span>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{b.reliability}/5</span>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{b.name}</h3>

              <div className="text-xs text-gray-600 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{b.phone}</span>
                </div>
                <p><strong>Area:</strong> {b.area || "N/A"}</p>
                <p><strong>Specialization:</strong> {b.specialization || "General"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
