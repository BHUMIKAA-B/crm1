import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import { canManageEmployees, allowedCreatableRoles, roleLabel, roleBadgeClass } from "../../lib/crmPermissions";
import toast from "react-hot-toast";
import { Users, Plus, TrendingUp, X, RefreshCw } from "lucide-react";

function CreateEmployeeModal({ onClose, onSuccess, userRole, currentUserId }) {
  const creatableRoles = allowedCreatableRoles(userRole);
  const defaultRole = creatableRoles[0] || "executive";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: defaultRole,
    department: userRole === "team_lead" ? "Sales Team" : "Operations"
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const modalTitle = userRole === "team_lead"
    ? "Create Team Member (Executive / Trainee)"
    : "Create Employee Account";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        reporting_manager: userRole === "team_lead" ? currentUserId : undefined
      };
      const res = await crmApi.post("/employees", payload);
      toast.success(`Account ${res.data.employee_id} created successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{modalTitle}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "name", label: "Full Name", span: 2, required: true },
              { k: "email", label: "Work Email", type: "email", span: 2, required: true },
              { k: "phone", label: "Phone Number", required: true },
              { k: "department", label: "Department" },
            ].map(({ k, label, type, span, required }) => (
              <div key={k} className={span === 2 ? "col-span-2" : ""}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required ? " *" : ""}</label>
                <input type={type || "text"} required={required} value={form[k]} onChange={set(k)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Permitted Role *</label>
              <select required value={form.role} onChange={set("role")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
                {creatableRoles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Initial Password *</label>
              <input type="password" required minLength={6} value={form.password} onChange={set("password")}
                placeholder="Set secure password"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CrmEmployees() {
  const { employee } = useCrmAuthStore();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const creatable = allowedCreatableRoles(employee?.role);
  const canCreate = creatable.length > 0;

  const buttonLabel = employee?.role === "team_lead"
    ? "+ Create Team Member"
    : "+ Create Employee";

  const pageTitle = employee?.role === "team_lead"
    ? "My Team & Staff Directory"
    : "Employees & Role Management";

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.get("/employees");
      setEmployees(res.data);
    } catch { toast.error("Failed to load employees"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (empId, status) => {
    try {
      await crmApi.patch(`/employees/${empId}/status`, null, { params: { status } });
      toast.success(`Employee status set to ${status}`);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update employee status");
    }
  };

  return (
    <div className="space-y-5">
      {showCreate && (
        <CreateEmployeeModal
          onClose={() => setShowCreate(false)}
          onSuccess={fetch}
          userRole={employee?.role}
          currentUserId={employee?.id}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500">{employees.length} active employee records</p>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <button onClick={fetch} className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> {buttonLabel}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading directory…</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No employees found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
            <thead className="bg-gray-50/70">
              <tr>
                {["ID", "Name", "Email", "Role", "Team", "Reports To", "Status", "Created By", "Created Date", "Actions"].map(h => (
                  <th key={h} className="px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-3">
                    <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {emp.employee_id || emp.id?.slice(0, 8) || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    {emp.name}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {emp.email}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${roleBadgeClass(emp.role)}`}>
                      {roleLabel(emp.role)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {emp.team_id ? (emp.team_id === emp.id ? "Team Owner" : emp.team_id) : (emp.department || "General")}
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {emp.reporting_manager_name || emp.reporting_manager || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      emp.status === "active" ? "bg-emerald-100 text-emerald-700"
                        : emp.status === "suspended" ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {emp.status || "active"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {emp.created_by_name || emp.created_by || "System"}
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {emp.created_at ? new Date(emp.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {["founder", "admin", "bdo", "team_lead"].includes(employee?.role) && emp.id !== employee?.id && (
                      <div className="flex gap-1.5">
                        {emp.status !== "active" && (
                          <button onClick={() => updateStatus(emp.id, "active")}
                            className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100">
                            Activate
                          </button>
                        )}
                        {emp.status === "active" && (
                          <button onClick={() => updateStatus(emp.id, "suspended")}
                            className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100">
                            Deactivate
                          </button>
                        )}
                        {emp.status !== "exited" && (
                          <button onClick={() => updateStatus(emp.id, "exited")}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100">
                            Exit
                          </button>
                        )}
                      </div>
                    )}
                    {emp.id === employee?.id && (
                      <span className="text-xs text-gray-400 italic">You</span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
