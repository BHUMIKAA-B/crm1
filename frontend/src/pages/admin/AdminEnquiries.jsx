import React, { useEffect, useState, useMemo } from "react";
import { Search, Loader2, CheckCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

export default function AdminEnquiries() {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/enquiries")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.phone?.includes(q) ||
      e.property_title?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resolve = async (e) => {
    try {
      await api.put(`/admin/enquiries/${e.id}`, { status: "resolved" });
      toast.success("Marked as resolved");
      load();
    } catch { toast.error("Could not update enquiry"); }
  };

  const remove = async (e) => {
    if (!window.confirm("Delete this enquiry?")) return;
    try {
      await api.delete(`/admin/enquiries/${e.id}`);
      toast.success("Enquiry deleted");
      load();
    } catch { toast.error("Could not delete enquiry"); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">
          Enquiries <span className="text-vs-text-secondary font-normal text-base">({filtered.length})</span>
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-text-secondary" />
          <input
            className="input-field !pl-8 !py-2 !text-sm w-64"
            placeholder="Search name, email, property…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-vs-bg">
            <tr>
              {["Customer", "Contact", "Property", "Date", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary">{h}</th>
              ))}
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="animate-spin text-vs-gold mx-auto" size={22} /></td></tr>
            )}
            {!loading && rows.map(e => (
              <React.Fragment key={e.id}>
                <tr className={`border-t border-vs-border hover:bg-vs-bg/50 transition-colors ${expanded === e.id ? "bg-vs-bg/30" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-vs-text-primary">{e.name}</div>
                  </td>
                  <td className="px-4 py-3 text-vs-text-secondary">
                    <div>{e.email}</div>
                    <div className="text-xs">{e.phone}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <div className="truncate text-vs-text-primary">{e.property_title || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-vs-text-secondary whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <EnqStatusBadge status={e.status || "pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(e.status || "pending") !== "resolved" && (
                        <button onClick={() => resolve(e)} title="Mark resolved"
                          className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-vs-text-secondary hover:text-emerald-600 transition-colors">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => remove(e)} title="Delete"
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-vs-text-secondary hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(x => x === e.id ? null : e.id)}
                      className="text-vs-text-secondary hover:text-vs-gold transition-colors"
                    >
                      {expanded === e.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </td>
                </tr>
                {expanded === e.id && (
                  <tr className="border-t border-vs-border bg-vs-bg/30">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="text-sm space-y-2">
                        <p className="text-vs-text-primary">{e.message || "(no message)"}</p>
                        {e.contact_preference && (
                          <p className="text-vs-text-secondary text-xs">Preferred contact: {e.contact_preference}</p>
                        )}
                        {e.assigned_to && (
                          <p className="text-vs-text-secondary text-xs">Assigned to: {e.assigned_to}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={7} className="py-12 text-center text-vs-text-secondary">No enquiries found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-vs-text-secondary">
          <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded border border-vs-border hover:bg-vs-bg disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 rounded border border-vs-border hover:bg-vs-bg disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

const EnqStatusBadge = ({ status }) => {
  const cls = {
    resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
    pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls[status] || "bg-vs-bg text-vs-text-secondary"}`}>{status}</span>;
};
