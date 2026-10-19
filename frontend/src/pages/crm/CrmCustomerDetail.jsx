import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import {
  User, Phone, Mail, MapPin, ArrowLeft, Plus, ChevronRight,
  FileText, ClipboardList
} from "lucide-react";
import { statusBadgeClass } from "../../lib/crmPermissions";

export default function CrmCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomer() {
      try {
        setLoading(true);
        const res = await crmApi.get(`/customers/${id}`);
        setCustomer(res.data);
      } catch {
        toast.error("Failed to load customer profile");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchCustomer();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading customer profile...</div>;
  }

  if (!customer) {
    return (
      <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100 space-y-4">
        <p className="text-base font-semibold text-gray-800">Customer Profile Not Found</p>
        <Link to="/crm/customers" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Back link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/crm/customers")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </button>
        <Link
          to="/crm/leads"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Lead
        </Link>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20 flex-shrink-0">
            {customer.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                {customer.type || "Customer"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-gray-900">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border border-gray-100">
            <strong>Notes:</strong> {customer.notes}
          </div>
        )}
      </div>

      {/* Associated Leads */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" /> Associated Leads ({customer.leads?.length || 0})
        </h2>
        {!customer.leads || customer.leads.length === 0 ? (
          <p className="text-xs text-gray-400">No active leads recorded for this customer.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {customer.leads.map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-700">{l.lead_id}</span>
                  <p className="text-xs text-gray-500 mt-0.5">Source: {l.source}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(l.status)}`}>
                    {l.status}
                  </span>
                  <Link
                    to={`/crm/leads/${l.id}`}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Associated Requirements */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" /> Requirements ({customer.requirements?.length || 0})
        </h2>
        {!customer.requirements || customer.requirements.length === 0 ? (
          <p className="text-xs text-gray-400">No requirements recorded for this customer.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customer.requirements.map((r) => (
              <div key={r.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                <p className="font-semibold text-gray-900 uppercase">{r.type} · {r.property_type}</p>
                <p className="text-gray-600">Budget: ₹{r.budget_min} - ₹{r.budget_max}</p>
                <p className="text-gray-500">Locations: {r.preferred_location?.join(", ") || "Any"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Associated Site / Office Visits */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-600" /> Office & Site Visits ({customer.site_visits?.length || 0})
        </h2>
        {!customer.site_visits || customer.site_visits.length === 0 ? (
          <p className="text-xs text-gray-400">No site visits scheduled for this customer.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {customer.site_visits.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-gray-900">{v.visit_id || "Visit"}</p>
                  <p className="text-gray-500">Date: {v.date} {v.time}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold uppercase">
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
