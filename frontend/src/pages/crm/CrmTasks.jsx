import React, { useEffect, useState, useCallback } from "react";
import crmApi from "../../api/crmClient";
import { useCrmAuthStore } from "../../store/crmAuthStore";
import toast from "react-hot-toast";
import { CalendarCheck, Plus, CheckCircle2, Clock, AlertTriangle, X, RefreshCw } from "lucide-react";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const priorityColor = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function CreateTaskModal({ onClose, onSuccess, employees }) {
  const { employee } = useCrmAuthStore();
  const [form, setForm] = useState({
    title: "", description: "", due_date: "", due_time: "",
    priority: "medium", assigned_to: employee?.id || "", type: "task",
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = form.type === "followup" ? "/tasks/followups" : "/tasks";
      await crmApi.post(endpoint, {
        title: form.title, description: form.description,
        due_date: form.due_date, due_time: form.due_time || undefined,
        priority: form.priority, assigned_to: form.assigned_to || undefined,
      });
      toast.success("Created successfully");
      onSuccess();
      onClose();
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
          <h2 className="text-lg font-semibold text-gray-900">New Task / Follow-up</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {["task", "followup"].map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input required value={form.title} onChange={set("title")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date *</label>
              <input type="date" required value={form.due_date} onChange={set("due_date")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Time</label>
              <input type="time" value={form.due_time} onChange={set("due_time")}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
            <select value={form.priority} onChange={set("priority")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assign To</label>
            <select value={form.assigned_to} onChange={set("assigned_to")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white">
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea rows={2} value={form.description} onChange={set("description")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CrmTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | overdue | today | completed
  const [showCreate, setShowCreate] = useState(false);
  const [employees, setEmployees] = useState([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const today = new Date().toISOString().split("T")[0];
      if (filter === "overdue") params.overdue = true;
      if (filter === "completed") params.status = "completed";
      const [tasksRes, empRes] = await Promise.all([
        crmApi.get("/tasks", { params }),
        crmApi.get("/employees"),
      ]);
      let data = tasksRes.data;
      if (filter === "today") {
        data = data.filter(t => t.due_date === today);
      }
      setTasks(data);
      setEmployees(empRes.data);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const completeTask = async (taskId) => {
    try {
      await crmApi.patch(`/tasks/${taskId}/complete`);
      toast.success("Task completed!");
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (t) => t.due_date < today && t.status !== "completed";
  const isDueToday = (t) => t.due_date === today;

  return (
    <div className="space-y-5">
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onSuccess={fetch} employees={employees} />}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks & Follow-ups</h1>
          <p className="text-sm text-gray-500">{tasks.length} items</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Filter tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            {[["all", "All"], ["overdue", "Overdue"], ["today", "Today"], ["completed", "Done"]].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === v ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={fetch} className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No tasks found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tasks.map(task => (
              <div key={task.id} className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors ${isOverdue(task) ? "border-l-2 border-l-red-400" : isDueToday(task) ? "border-l-2 border-l-amber-400" : ""}`}>
                <div className="flex-shrink-0 mt-0.5">
                  {task.status === "completed"
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : isOverdue(task)
                    ? <AlertTriangle className="w-5 h-5 text-red-500" />
                    : <Clock className="w-5 h-5 text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-900"}`}>
                      {task.title}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.type === "followup" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">Follow-up</span>
                    )}
                  </div>
                  {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                  <p className={`text-xs mt-1 font-medium ${isOverdue(task) ? "text-red-500" : isDueToday(task) ? "text-amber-600" : "text-gray-400"}`}>
                    Due: {new Date(task.due_date).toLocaleDateString("en-IN")}
                    {task.due_time && ` at ${task.due_time}`}
                  </p>
                </div>
                {task.status !== "completed" && (
                  <button onClick={() => completeTask(task.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                    Mark Done
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
