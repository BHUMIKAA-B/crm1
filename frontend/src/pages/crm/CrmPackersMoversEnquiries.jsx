import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, MapPin, Phone, RefreshCw, Search, Truck, User, CalendarDays } from "lucide-react";
import api from "@/api/client";

const statusClass = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  contacted: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  consultation_scheduled: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
  proposal_sent: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  in_progress: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
  closed_won: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  closed_lost: "bg-slate-500/10 text-slate-500 border-slate-500/30",
};

export default function CrmPackersMoversEnquiries() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [query, setQuery] = useState("");

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/crm/packers-movers-enquiries", { params: query ? { search: query } : {} });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load packers & movers enquiries");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadDetail = async (id) => {
    try {
      const { data } = await api.get(`/crm/packers-movers-enquiries/${id}`);
      setSelectedItem(data);
    } catch {
      toast.error("Failed to load enquiry detail");
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[90rem] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-7 h-7 text-vs-gold" /> Packers & Movers Enquiries
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Special Services → Packers & Movers</p>
        </div>
        <button onClick={fetchEnquiries} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors self-start md:self-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-vs-border bg-vs-surface p-3">
        <Search className="w-4 h-4 text-vs-text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by customer, mobile, city or enquiry ID" className="w-full bg-transparent text-sm outline-none placeholder:text-vs-text-muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-xl border border-vs-border bg-vs-surface">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center gap-2 text-vs-text-secondary"><Loader2 className="h-4 w-4 animate-spin" /> Loading enquiries...</div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-vs-text-secondary">No enquiries yet.</div>
          ) : (
            <div className="divide-y divide-vs-border">
              {items.map((item) => (
                <button key={item.id} type="button" onClick={() => loadDetail(item.id)} className="w-full bg-transparent p-4 text-left transition hover:bg-vs-bg">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-vs-text-primary">{item.customer_name}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass[item.status] || "bg-slate-500/10 text-slate-500 border-slate-500/30"}`}>
                          {item.status || "new"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-vs-text-secondary">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {item.mobile}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.pickup_city || item.destination_city || "—"}</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {item.preferred_move_date || "Flexible date"}</span>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-vs-gold">{item.packers_movers_enquiry_id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-vs-border bg-vs-surface p-5">
          {selectedItem ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-vs-gold">Detail</div>
                <h2 className="mt-2 text-xl font-semibold text-vs-text-primary">{selectedItem.customer_name}</h2>
              </div>
              <div className="grid gap-3 text-sm text-vs-text-secondary">
                <div className="flex items-center gap-2"><User className="h-4 w-4" /> {selectedItem.customer_name}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {selectedItem.mobile}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {selectedItem.pickup_city} → {selectedItem.destination_city}</div>
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {selectedItem.preferred_move_date || "Flexible date"}</div>
              </div>
              <div className="rounded-lg border border-vs-border bg-vs-bg p-3 text-sm text-vs-text-secondary">
                <div className="font-medium text-vs-text-primary">Services</div>
                <div className="mt-2">{(selectedItem.services_required || []).join(", ")}</div>
              </div>
              <div className="rounded-lg border border-vs-border bg-vs-bg p-3 text-sm text-vs-text-secondary">
                <div className="font-medium text-vs-text-primary">Move details</div>
                <div className="mt-2">{selectedItem.moving_type} · {selectedItem.property_type} · {selectedItem.property_size}</div>
              </div>
              {selectedItem.uploaded_files?.length > 0 && (
                <div className="rounded-lg border border-vs-border bg-vs-bg p-3 text-sm text-vs-text-secondary">
                  <div className="font-medium text-vs-text-primary">Files</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{selectedItem.uploaded_files.map((file) => <li key={file.name}>{file.name}</li>)}</ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center text-vs-text-secondary">Select an enquiry to view details.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
