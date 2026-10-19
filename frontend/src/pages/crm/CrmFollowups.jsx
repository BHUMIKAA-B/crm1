import React, { useEffect, useState } from "react";
import crmApi from "../../api/crmClient";
import toast from "react-hot-toast";
import { Clock, CheckCircle2, AlertTriangle, Filter } from "lucide-react";

export default function CrmFollowups() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, overdue, pending, completed

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const param = filter === "overdue" ? "?overdue=true" : filter !== "all" ? `?status=${filter}` : "";
      const res = await crmApi.get(`/followups${param}`);
      setFollowups(res.data);
    } catch {
      toast.error("Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await crmApi.patch(`/followups/${id}/status`, { status: newStatus });
      toast.success("Follow-up updated");
      fetchFollowups();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups Calendar & Tasks</h1>
          <p className="text-sm text-gray-500">Ensure every active lead has a planned next action</p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
          {["all", "overdue", "pending", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                filter === f
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading follow-ups...</div>
      ) : followups.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          No follow-ups matching filter.
        </div>
      ) : (
        <div className="space-y-3">
          {followups.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                item.is_overdue
                  ? "border-red-200 bg-red-50/20"
                  : "border-gray-100"
              }`}
            >
              <div className="flex items-start gap-3">
                {item.is_overdue ? (
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>Due: <strong>{item.due_date} {item.due_time || ""}</strong></span>
                    <span className="capitalize px-2 py-0.5 rounded bg-gray-100 font-medium">{item.priority} priority</span>
                    {item.is_overdue && <span className="text-red-600 font-bold">OVERDUE</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.status !== "completed" ? (
                  <button
                    onClick={() => handleStatusChange(item.id, "completed")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Complete
                  </button>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg">Completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
