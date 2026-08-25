import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Shield, Plus, Phone, Mail, MapPin } from "lucide-react";

export default function CrmOwners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/owners");
      setOwners(res.data);
    } catch {
      toast.error("Failed to load property owners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Owners Directory</h1>
          <p className="text-sm text-gray-500">BDO & Acquisition Owner Directory</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading owners...</div>
      ) : owners.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No property owners recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {owners.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {o.owner_id}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base">{o.name}</h3>

              <div className="text-xs text-gray-600 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{o.mobile}</span>
                </div>
                {o.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{o.email}</span>
                  </div>
                )}
                {o.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{o.address}</span>
                  </div>
                )}
              </div>
              {o.notes && <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">{o.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
