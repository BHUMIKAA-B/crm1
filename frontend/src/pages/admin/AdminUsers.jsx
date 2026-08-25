import React, { useEffect, useState, useMemo } from "react";
import { Search, Loader2, UserX, UserCheck2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

export default function AdminUsers({ role = "all" }) {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir,   setSortDir]   = useState(-1);

  const load = () => {
    setLoading(true);
    api.get("/admin/users")
      .then(({ data }) => setUsers(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); setPage(1); setSearch(""); }, [role]);

  const filtered = useMemo(() => {
    let list = role === "all" ? users : users.filter(u => u.role === role);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      return sortDir * (av < bv ? -1 : av > bv ? 1 : 0);
    });
  }, [users, role, search, sortField, sortDir]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const rows  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleStatus = async (u) => {
    try {
      await api.put(`/admin/users/${u.id}/status`, { is_active: !u.is_active });
      toast.success(u.is_active ? "User deactivated" : "User activated");
      load();
    } catch { toast.error("Could not update user"); }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete "${u.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success("User deleted");
      load();
    } catch { toast.error("Could not delete user"); }
  };

  const sort = (field) => {
    if (sortField === field) setSortDir(d => d * -1);
    else { setSortField(field); setSortDir(-1); }
  };

  const TITLE = { all: "All Users", buyer: "Buyers", seller: "Sellers" };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">
          {TITLE[role]} <span className="text-vs-text-secondary font-normal text-base">({filtered.length})</span>
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-text-secondary" />
          <input
            className="input-field !pl-8 !py-2 !text-sm w-64"
            placeholder="Search name, email, phone…"
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
              <SortTh field="name"       active={sortField} dir={sortDir} onSort={sort}>Name</SortTh>
              <SortTh field="email"      active={sortField} dir={sortDir} onSort={sort}>Email</SortTh>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary">Phone</th>
              <SortTh field="role"       active={sortField} dir={sortDir} onSort={sort}>Role</SortTh>
              <SortTh field="created_at" active={sortField} dir={sortDir} onSort={sort}>Joined</SortTh>
              <SortTh field="is_active"  active={sortField} dir={sortDir} onSort={sort}>Status</SortTh>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Loader2 className="animate-spin text-vs-gold mx-auto" size={22} />
                </td>
              </tr>
            )}
            {!loading && rows.map(u => (
              <tr key={u.id} className="border-t border-vs-border hover:bg-vs-bg/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-vs-gold/10 flex items-center justify-center text-vs-gold text-xs font-bold shrink-0">
                      {u.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="font-medium text-vs-text-primary truncate max-w-[140px]">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-vs-text-secondary truncate max-w-[180px]">{u.email}</td>
                <td className="px-4 py-3 text-vs-text-secondary">{u.phone || "—"}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 text-vs-text-secondary whitespace-nowrap">
                  {new Date(u.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge active={u.is_active} />
                </td>
                <td className="px-4 py-3">
                  {u.role !== "admin" && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleStatus(u)}
                        title={u.is_active ? "Deactivate" : "Activate"}
                        className="p-1.5 rounded hover:bg-vs-bg text-vs-text-secondary hover:text-vs-gold transition-colors"
                      >
                        {u.is_active ? <UserX size={14} /> : <UserCheck2 size={14} />}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        title="Delete user"
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-vs-text-secondary hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-vs-text-secondary">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-vs-text-secondary">
          <span>
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={14} />
            </PagBtn>
            {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
              const p = i + 1;
              return (
                <PagBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PagBtn>
              );
            })}
            <PagBtn onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
              <ChevronRight size={14} />
            </PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

const RoleBadge = ({ role }) => {
  const cls = {
    admin:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    seller: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    buyer:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls[role] || "bg-vs-bg text-vs-text-secondary"}`}>
      {role}
    </span>
  );
};

const StatusBadge = ({ active }) => (
  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
    active
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
  }`}>
    {active ? "Active" : "Disabled"}
  </span>
);

const SortTh = ({ field, active, dir, onSort, children }) => (
  <th
    onClick={() => onSort(field)}
    className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary cursor-pointer hover:text-vs-text-primary select-none whitespace-nowrap"
  >
    {children}
    {active === field ? (dir === 1 ? " ↑" : " ↓") : ""}
  </th>
);

const PagBtn = ({ children, onClick, disabled, active }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`min-w-[30px] h-[30px] px-1 rounded border text-xs transition-colors
      ${active ? "border-vs-gold bg-vs-gold/10 text-vs-gold font-medium" : "border-vs-border hover:bg-vs-bg"}
      disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);
