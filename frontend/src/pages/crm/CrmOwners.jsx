import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import { Shield, Plus, Phone, Mail, MapPin, Globe, UserCheck, X } from "lucide-react";

export default function CrmOwners() {
  const { employee } = useCrmAuthStore();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const canAdd = ["founder", "admin", "bdo", "team_lead"].includes(employee?.role);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/owners");
      setOwners(res.data || []);
    } catch {
      toast.error("Failed to load property owners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleCreateOwner = async (e) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      toast.error("Please provide Owner Name and Mobile number");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        notes: notes.trim(),
        source: "manual_crm"
      };
      const res = await crmApi.post("/owners", payload);
      toast.success(res.data?.message || "Owner record created successfully");
      setName(""); setMobile(""); setEmail(""); setAddress(""); setNotes("");
      setShowModal(false);
      fetchOwners();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create owner record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Owners Directory</h1>
          <p className="text-sm text-gray-500">
            {employee?.role === "team_lead"
              ? "Team Leader Manual Entry & Team Owner Records"
              : "Organization & Website Property Owners"}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Owner Record
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading owners...</div>
      ) : owners.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100 shadow-sm">
          <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-800">No owner records available</h3>
          <p className="text-xs text-gray-500 mt-1">
            {canAdd ? "Click 'Add Owner Record' above to manually create an owner entry." : "No owner records assigned to your current team scope."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {owners.map((o) => (
            <div key={o.id || o.owner_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {o.owner_id}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                  o.source === "public_website"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {o.source === "public_website" ? (
                    <><Globe className="w-3 h-3" /> Public Website</>
                  ) : (
                    <><UserCheck className="w-3 h-3" /> Manual CRM Entry</>
                  )}
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

      {/* Add Owner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Manually Add Owner Record</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleCreateOwner} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Owner Name *</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email (Optional)</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address (Optional)</label>
                <input
                  type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, State"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Property Details</label>
                <textarea
                  rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Property owned details, specifications..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Owner Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
