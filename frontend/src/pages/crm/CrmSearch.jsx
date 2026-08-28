import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Search, Users, Building2, UserCheck, Handshake } from "lucide-react";

export default function CrmSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setLoading(true);
      crmApi.get(`/search?q=${encodeURIComponent(query)}`)
        .then((res) => setResults(res.data))
        .catch(() => toast.error("Search failed"))
        .finally(() => setLoading(false));
    }
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Global Search Results</h1>
        <p className="text-sm text-gray-500">Search results for <span className="font-semibold text-blue-600">"{query}"</span></p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Searching system database...</div>
      ) : !results ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          Type at least 2 characters to search.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Leads */}
          {results.leads?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Leads ({results.leads.length})
              </h2>
              <div className="divide-y divide-gray-100">
                {results.leads.map((l) => (
                  <Link key={l.id} to={`/crm/leads/${l.id}`} className="block py-2 hover:bg-gray-50/50 rounded px-2">
                    <p className="font-semibold text-sm text-blue-600">{l.lead_id} — {l.customer?.name}</p>
                    <p className="text-xs text-gray-500">Status: {l.status} · Source: {l.source}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Properties */}
          {results.properties?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Properties ({results.properties.length})
              </h2>
              <div className="divide-y divide-gray-100">
                {results.properties.map((p) => (
                  <div key={p.id} className="py-2 px-2">
                    <Link to={`/properties/${p.id}`} target="_blank" rel="noopener noreferrer">
                      <p className="font-semibold text-sm text-gray-900 hover:text-blue-600 hover:underline">{p.title || p.property_id}</p>
                    </Link>
                    <p className="text-xs text-gray-500">Price: ₹{p.price?.toLocaleString()} · Status: {p.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {results.customers?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-500" />
                Customers ({results.customers.length})
              </h2>
              <div className="divide-y divide-gray-100">
                {results.customers.map((c) => (
                  <Link key={c.id} to={`/crm/customers/${c.id}`} className="block py-2 px-2 hover:bg-gray-50/50 rounded">
                    <p className="font-semibold text-sm text-purple-600 hover:underline">{c.name} ({c.phone})</p>
                    <p className="text-xs text-gray-500">Type: {c.type} · {c.email || ""}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
