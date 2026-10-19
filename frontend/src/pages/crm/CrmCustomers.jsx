import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { User, Phone, Mail, Plus, RefreshCw, ChevronRight, X } from "lucide-react";

function CreateCustomerModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await crmApi.post("/customers", form);
      if (res.data.duplicate) {
        toast.error("Customer already exists with this phone number.");
      } else {
        toast.success("Customer created");
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Customer</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {[
            { k: "name", label: "Full Name", required: true },
            { k: "phone", label: "Phone", required: true },
            { k: "email", label: "Email", type: "email" },
            { k: "address", label: "Address" },
          ].map(({ k, label, required, type }) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required ? " *" : ""}</label>
              <input type={type || "text"} required={required} value={form[k]} onChange={set(k)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={set("notes")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CrmCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.get("/customers", { params: search ? { q: search } : {} });
      setCustomers(res.data);
    } catch { toast.error("Failed to load customers"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-5">
      {showCreate && <CreateCustomerModal onClose={() => setShowCreate(false)} onSuccess={fetch} />}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} customers</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetch()}
              className="pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-52"
            />
          </div>
          <button onClick={fetch} className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))
          : customers.length === 0
          ? (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No customers found</p>
            </div>
          )
          : customers.map((cust) => (
            <Link
              key={cust.id}
              to={`/crm/customers/${cust.id}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {cust.name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{cust.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {cust.phone}
                  </p>
                  {cust.email && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {cust.email}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))
        }
      </div>
    </div>
  );
}
