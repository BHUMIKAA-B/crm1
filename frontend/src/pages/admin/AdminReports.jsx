import React, { useState } from "react";
import { Download, Users, Building2, MessageSquare, FolderOpen, Loader2 } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const REPORTS = [
  {
    id: "users",
    title: "Users Report",
    description: "All registered users — name, email, phone, role, status, signup date.",
    icon: Users,
    color: "from-blue-500 to-blue-700",
    endpoint: "/admin/reports/users",
    filename: "users_report.csv",
  },
  {
    id: "properties",
    title: "Properties Report",
    description: "Every property listing — title, category, city, price, status, seller, date.",
    icon: Building2,
    color: "from-emerald-500 to-emerald-700",
    endpoint: "/admin/reports/properties",
    filename: "properties_report.csv",
  },
  {
    id: "enquiries",
    title: "Enquiries Report",
    description: "All customer enquiries — name, contact, property, message, status, date.",
    icon: MessageSquare,
    color: "from-purple-500 to-purple-700",
    endpoint: "/admin/reports/enquiries",
    filename: "enquiries_report.csv",
  },
  {
    id: "projects",
    title: "Projects Report",
    description: "All builder projects — title, sector, city, status, builder, possession, date.",
    icon: FolderOpen,
    color: "from-amber-500 to-amber-700",
    endpoint: "/admin/reports/projects",
    filename: "projects_report.csv",
  },
];

export default function AdminReports() {
  const [downloading, setDownloading] = useState({});

  const download = async (report) => {
    setDownloading(d => ({ ...d, [report.id]: true }));
    try {
      const res = await api.get(report.endpoint, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = report.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${report.title} downloaded`);
    } catch {
      toast.error("Could not generate report");
    } finally {
      setDownloading(d => ({ ...d, [report.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">Reports</h2>
        <p className="text-vs-text-secondary text-sm mt-1">Download data exports as CSV files.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        {REPORTS.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.id} className="card p-5 flex flex-col gap-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-vs-text-primary">{r.title}</h3>
                <p className="text-vs-text-secondary text-xs mt-1 leading-relaxed">{r.description}</p>
              </div>
              <button
                onClick={() => download(r)}
                disabled={downloading[r.id]}
                className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-vs-border hover:bg-vs-bg text-vs-text-primary text-sm font-medium transition-colors disabled:opacity-60"
              >
                {downloading[r.id]
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Download size={14} />
                }
                Download CSV
              </button>
            </div>
          );
        })}
      </div>

      {/* Activity Logs */}
      <ActivityLogs />
    </div>
  );
}

function ActivityLogs() {
  const [logs,    setLogs]    = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get("/admin/activity-logs?limit=50")
      .then(({ data }) => setLogs(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5">
      <h3 className="font-display font-semibold text-vs-text-primary mb-4">Activity Log</h3>
      {loading && <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-vs-gold" size={20} /></div>}
      {!loading && !logs.length && <p className="text-vs-text-secondary text-sm">No activity recorded yet.</p>}
      {!loading && logs.length > 0 && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {logs.map(l => (
            <div key={l.id} className="flex items-start gap-3 py-2 border-b border-vs-border last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-vs-gold mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-vs-text-primary font-medium">{l.action}</span>
                {l.detail && <span className="text-sm text-vs-text-secondary"> — {l.detail}</span>}
              </div>
              <span className="text-xs text-vs-text-secondary whitespace-nowrap shrink-0">
                {new Date(l.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
