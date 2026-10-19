import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { FileText, Plus, Search, Filter } from "lucide-react";
import { formatCurrency } from "../../lib/crmPermissions";

export default function CrmRequirements() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReqs = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/requirements");
      setReqs(res.data);
    } catch {
      toast.error("Failed to load requirements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReqs();
  }, []);

  const filtered = reqs.filter((r) =>
    r.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.property_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Requirements</h1>
          <p className="text-sm text-gray-500">Track and match property requests for active buyers</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by customer name or property type..."
          className="flex-1 text-sm bg-transparent outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading requirements...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No requirements found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                    {r.type} · {r.property_type}
                  </span>
                  <h3 className="font-semibold text-gray-900 mt-2">{r.customer?.name || "Customer"}</h3>
                  <p className="text-xs text-gray-500">{r.customer?.phone}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-50 text-xs space-y-1.5 text-gray-600">
                <p><strong>Budget:</strong> {formatCurrency(r.budget_min)} – {formatCurrency(r.budget_max)}</p>
                <p><strong>Preferred Locations:</strong> {r.preferred_location?.join(", ") || "Any"}</p>
                <p><strong>Size:</strong> {r.size_min} – {r.size_max} sqft</p>
                <p><strong>Timeline:</strong> {r.timeline || "Flexible"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
