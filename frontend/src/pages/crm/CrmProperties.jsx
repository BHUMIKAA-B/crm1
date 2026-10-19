import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Building2, Plus, Sparkles, CheckCircle2, ShieldAlert, Filter } from "lucide-react";
import { formatCurrency, canSeeFinancials } from "../../lib/crmPermissions";
import { useCrmAuthStore } from "../../store/crmAuthStore";

export default function CrmProperties() {
  const { employee } = useCrmAuthStore();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchReqId, setMatchReqId] = useState("");
  const [matchingResults, setMatchingResults] = useState(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const role = employee?.role;

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/properties");
      setProperties(res.data);
    } catch {
      toast.error("Failed to load property inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleVerify = async (propId, status) => {
    try {
      await crmApi.patch(`/properties/${propId}/verify`, { verification_status: status });
      toast.success(`Property marked as ${status}`);
      fetchProperties();
    } catch {
      toast.error("Failed to update verification status");
    }
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!matchReqId.trim()) return;
    try {
      setMatchingLoading(true);
      const res = await crmApi.get(`/properties/match/${matchReqId.trim()}`);
      setMatchingResults(res.data);
    } catch {
      toast.error("Failed to match properties");
    } finally {
      setMatchingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Inventory & Matching Engine</h1>
          <p className="text-sm text-gray-500">Verified properties & intelligent rule-based customer requirement matching</p>
        </div>
      </div>

      {/* Property Matching Engine Panel */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">Rule-Based Property Matching Engine</h2>
        </div>
        <p className="text-xs text-blue-200">Enter a Customer Requirement ID to calculate instant match scores based on budget, property type, location, size & facing preferences.</p>
        
        <form onSubmit={handleMatch} className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={matchReqId}
            onChange={(e) => setMatchReqId(e.target.value)}
            placeholder="Enter Requirement ID..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={matchingLoading}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-lg text-sm transition-colors shadow-lg shadow-amber-400/20"
          >
            {matchingLoading ? "Matching..." : "Run Match"}
          </button>
        </form>

        {matchingResults && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Top Matched Properties ({matchingResults.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchingResults.map((m) => (
                <div key={m.id} className="bg-white/10 p-3 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <Link to={`/properties/${m.id}`} target="_blank" rel="noopener noreferrer">
                      <p className="font-semibold hover:underline">{m.title || m.property_id}</p>
                    </Link>
                    <p className="text-blue-200">{formatCurrency(m.price)} · {m.category || m.sub_category}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-amber-400 text-slate-900 rounded-full">
                    {m.match_percentage}% Match
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Property Inventory List */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Inventory Directory</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading inventory...</div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
            No properties in inventory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {p.property_id || "VS-PROP"}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                    p.verification_status === "verified" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {p.verification_status || p.status}
                  </span>
                </div>

                <Link to={`/properties/${p.id}`} target="_blank" rel="noopener noreferrer">
                  <h3 className="font-bold text-gray-900 text-base hover:text-blue-600 hover:underline cursor-pointer">
                    {p.title}
                  </h3>
                </Link>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(p.price)}</p>

                <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-lg">
                  <p><strong>Category:</strong> {p.category} ({p.sub_category || "Standard"})</p>
                  <p><strong>Location:</strong> {p.location?.address || p.location?.city || "Bangalore"}</p>
                  <p><strong>Area:</strong> {p.area?.size} {p.area?.unit}</p>
                </div>

                {role in ["founder", "admin", "bdo", "team_lead"] && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleVerify(p.id, "verified")}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                    >
                      Verify Property
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
