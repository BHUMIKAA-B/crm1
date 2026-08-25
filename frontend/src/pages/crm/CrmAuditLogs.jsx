import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { ShieldAlert, User, Clock } from "lucide-react";

export default function CrmAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmApi.get("/audit-logs")
      .then((res) => setLogs(res.data))
      .catch((err) => toast.error(err.response?.data?.detail || "Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Audit Trail</h1>
        <p className="text-sm text-gray-500">Founder & Admin immutable record of employee activities, status changes, and assignments</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading audit trail...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No audit logs recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Old Value</th>
                <th className="px-4 py-3">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-gray-400">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.employee_name || l.who} ({l.employee_role})</td>
                  <td className="px-4 py-3 font-semibold text-blue-600 uppercase">{l.action}</td>
                  <td className="px-4 py-3 uppercase">{l.entity}</td>
                  <td className="px-4 py-3 font-mono">{l.entity_id}</td>
                  <td className="px-4 py-3 text-red-500">{l.old_value !== null ? String(l.old_value) : "—"}</td>
                  <td className="px-4 py-3 text-emerald-600">{l.new_value !== null ? String(l.new_value) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
