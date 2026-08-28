import React, { useEffect, useState, useMemo } from "react";
import { Search, Loader2, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, CheckSquare, Square } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";
import { INR, CATEGORY_LABEL } from "@/utils/format";

const PAGE_SIZE = 20;
const STATUSES  = ["all", "pending_verification", "published", "rejected"];

export default function AdminProperties({ categoryFilter, title = "Properties" }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("all");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    api.get(`/admin/properties?${params}`)
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); setSelected(new Set()); setPage(1); }, [categoryFilter]);

  const filtered = useMemo(() => {
    let list = items;
    if (status !== "all") list = list.filter(p => p.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.location?.city?.toLowerCase().includes(q) ||
        p.listed_by_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, status, search]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(s =>
    s.size === rows.length ? new Set() : new Set(rows.map(r => r.id))
  );

  const bulk = async (action) => {
    if (!selected.size) return;
    if (!window.confirm(`${action} ${selected.size} propert${selected.size > 1 ? "ies" : "y"}?`)) return;
    setBulkBusy(true);
    try {
      await api.post("/admin/properties/bulk", { ids: [...selected], action });
      toast.success(`Bulk ${action} done`);
      setSelected(new Set());
      load();
    } catch { toast.error("Bulk action failed"); }
    finally { setBulkBusy(false); }
  };

  const deleteSingle = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await api.delete(`/admin/properties/${p.id}`);
      toast.success("Property deleted");
      load();
    } catch { toast.error("Could not delete"); }
  };

  const approve = async (p) => {
    try {
      await api.put(`/admin/properties/${p.id}/verify`, { notes: "" });
      toast.success("Property approved");
      load();
    } catch { toast.error("Could not approve"); }
  };

  const STATUS_LABEL = {
    all: "All", pending_verification: "Pending", published: "Approved", rejected: "Rejected",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">
          {title} <span className="text-vs-text-secondary font-normal text-base">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {selected.size > 0 && (
            <>
              <button onClick={() => bulk("approve")} disabled={bulkBusy}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60">
                <CheckCircle size={13} /> Approve ({selected.size})
              </button>
              <button onClick={() => bulk("delete")} disabled={bulkBusy}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium disabled:opacity-60">
                <Trash2 size={13} /> Delete ({selected.size})
              </button>
            </>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-text-secondary" />
            <input
              className="input-field !pl-8 !py-2 !text-sm w-56"
              placeholder="Search…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap border-b border-vs-border pb-0">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); setSelected(new Set()); }}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              status === s
                ? "border-vs-gold text-vs-gold font-medium"
                : "border-transparent text-vs-text-secondary hover:text-vs-text-primary"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-vs-bg">
            <tr>
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll} className="text-vs-text-secondary hover:text-vs-gold">
                  {selected.size === rows.length && rows.length > 0 ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>
              </th>
              {["Image", "Title", "Category", "City", "Price", "Status", "Seller", "Date", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="py-16 text-center"><Loader2 className="animate-spin text-vs-gold mx-auto" size={22} /></td></tr>
            )}
            {!loading && rows.map(p => (
              <tr key={p.id} className={`border-t border-vs-border hover:bg-vs-bg/50 transition-colors ${selected.has(p.id) ? "bg-vs-gold/5" : ""}`}>
                <td className="px-4 py-3">
                  <button onClick={() => toggleSelect(p.id)} className="text-vs-text-secondary hover:text-vs-gold">
                    {selected.has(p.id) ? <CheckSquare size={15} className="text-vs-gold" /> : <Square size={15} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {p.images?.[0]?.url
                    ? <img src={p.images[0].url} alt="" className="w-14 h-10 object-cover rounded-lg" />
                    : <div className="w-14 h-10 bg-vs-bg rounded-lg" />
                  }
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  <div className="font-medium text-vs-text-primary truncate">{p.title}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="chip capitalize">{CATEGORY_LABEL?.[p.category] || p.category}</span>
                </td>
                <td className="px-4 py-3 text-vs-text-secondary">{p.location?.city || "—"}</td>
                <td className="px-4 py-3 font-medium text-vs-text-primary whitespace-nowrap">{INR(p.price)}</td>
                <td className="px-4 py-3"><PropStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-vs-text-secondary text-xs">{p.listed_by_name || "—"}</td>
                <td className="px-4 py-3 text-vs-text-secondary whitespace-nowrap text-xs">
                  {new Date(p.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {p.status !== "published" && (
                      <button onClick={() => approve(p)} title="Approve"
                        className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-vs-text-secondary hover:text-emerald-600 transition-colors">
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button onClick={() => deleteSingle(p)} title="Delete"
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-vs-text-secondary hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={10} className="py-12 text-center text-vs-text-secondary">No properties found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-vs-text-secondary">
          <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></PagBtn>
            <PagBtn onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}><ChevronRight size={14} /></PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

const PropStatusBadge = ({ status }) => {
  const cls = {
    published:            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    pending_verification: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    rejected:             "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const label = { published: "Approved", pending_verification: "Pending", rejected: "Rejected" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls[status] || "bg-vs-bg text-vs-text-secondary"}`}>{label[status] || status}</span>;
};

const PagBtn = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="min-w-[30px] h-[30px] px-1 rounded border border-vs-border text-xs hover:bg-vs-bg disabled:opacity-40 disabled:cursor-not-allowed">
    {children}
  </button>
);
