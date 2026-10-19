import React, { useEffect, useState } from "react";
import { Search, Download, Loader2, BookOpen, Filter } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

export default function AdminBrochureDownloads() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    setLoading(true);
    api.get("/admin/brochure-downloads")
      .then(({ data }) => setItems(data || []))
      .catch(() => toast.error("Could not load brochure downloads"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.user_name?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.property_name?.toLowerCase().includes(q)
    );
  });

  const exportCsv = async () => {
    try {
      const res = await api.get("/admin/brochure-downloads/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = "brochure_downloads.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">
          Brochure Downloads
          <span className="text-vs-text-secondary font-normal text-base ml-2">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-text-secondary" />
            <input
              className="input-field !pl-8 !py-2 !text-sm w-56"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-vs-border text-sm text-vs-text-secondary hover:text-vs-gold hover:border-vs-gold transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-vs-bg">
            <tr>
              {["Name", "Phone", "Email", "Property Downloaded", "Date", "IP"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Loader2 className="animate-spin text-vs-gold mx-auto" size={22} />
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <BookOpen size={36} className="text-vs-text-muted mx-auto mb-3" />
                  <p className="text-vs-text-secondary text-sm">No brochure downloads yet.</p>
                </td>
              </tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={r.id} className="border-t border-vs-border hover:bg-vs-bg/50 transition-colors">
                <td className="px-4 py-3 font-medium text-vs-text-primary">{r.user_name}</td>
                <td className="px-4 py-3 text-vs-text-secondary">{r.phone}</td>
                <td className="px-4 py-3 text-vs-text-secondary">{r.email || "—"}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-vs-text-primary truncate max-w-[200px]">
                    {r.property_name || "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-vs-text-secondary whitespace-nowrap">
                  {r.downloaded_at ? new Date(r.downloaded_at).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3 text-vs-text-muted text-xs">{r.ip_address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
