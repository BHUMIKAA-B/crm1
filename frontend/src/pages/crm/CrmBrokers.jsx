import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import { Building, Plus, Phone, Star, X, Building2 } from "lucide-react";

export default function CrmBrokers() {
  const { employee } = useCrmAuthStore();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [area, setArea] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [reliability, setReliability] = useState(4);
  const [notes, setNotes] = useState("");

  const canManageBrokers = ["founder", "admin", "bdo"].includes(employee?.role);

  const fetchBrokers = async () => {
    try {
      setLoading(true);
      const res = await crmApi.get("/brokers");
      setBrokers(res.data || []);
    } catch {
      toast.error("Failed to load brokers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  const handleCreateBroker = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please provide Broker Name and Phone number");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        company: company.trim(),
        area: area.trim(),
        specialization: specialization.trim(),
        reliability: parseInt(reliability, 10),
        notes: notes.trim()
      };
      const res = await crmApi.post("/brokers", payload);
      toast.success(res.data?.message || "Broker created successfully");
      setName(""); setPhone(""); setCompany(""); setArea(""); setSpecialization(""); setNotes("");
      setShowModal(false);
      fetchBrokers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create broker");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brokers & Channel Partners</h1>
          <p className="text-sm text-gray-500">Restricted to Founder & BDO Management</p>
        </div>
        {canManageBrokers && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Broker
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading brokers...</div>
      ) : brokers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100 shadow-sm">
          <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-800">No brokers available</h3>
          <p className="text-xs text-gray-500 mt-1">
            {canManageBrokers ? "Click 'Add Broker' above to manually create a broker entry." : "You do not have permission to view broker records."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brokers.map((b) => (
            <div key={b.id || b.broker_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
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
                {b.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>{b.company}</span>
                  </div>
                )}
                <p><strong>Area:</strong> {b.area || "N/A"}</p>
                <p><strong>Specialization:</strong> {b.specialization || "General"}</p>
              </div>
              {b.notes && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{b.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add Broker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Broker Entry</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleCreateBroker} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Broker Name *</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Sharma"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Organization</label>
                <input
                  type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                  placeholder="Sharma Realty Pvt Ltd"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Operating Area</label>
                  <input
                    type="text" value={area} onChange={(e) => setArea(e.target.value)}
                    placeholder="South Bangalore"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reliability (1-5)</label>
                  <select
                    value={reliability} onChange={(e) => setReliability(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>{num} Star{num > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Specialization</label>
                <input
                  type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Commercial Plots, Luxury Villas"
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
                  {submitting ? "Saving..." : "Save Broker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
