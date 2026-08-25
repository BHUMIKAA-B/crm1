import React, { useEffect, useState } from "react";
import {
  Loader2, RefreshCw, CheckCircle2, Trash2, Eye,
  XCircle, MapPin, User, Calendar, AlertCircle,
} from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";
import { INR, CATEGORY_LABEL } from "@/utils/format";

export default function AdminRejectedProperties({ onAction }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState({});

  const load = () => {
    setLoading(true);
    api.get("/admin/properties/rejected")
      .then(({ data }) => setItems(data || []))
      .catch(() => toast.error("Could not load rejected properties"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const act = async (id, fn, msg) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fn();
      toast.success(msg);
      load();
      onAction?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Action failed");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const restore = (id) =>
    act(id, () => api.put(`/admin/properties/${id}/restore`), "Property restored to pending queue");

  const approve = (id) =>
    act(id, () => api.put(`/admin/properties/${id}/verify`, { notes: "Approved from rejected queue" }), "Property approved and published");

  const remove = (id, title) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    act(id, () => api.delete(`/admin/properties/${id}`), "Property permanently deleted");
  };

  if (loading) return <Spin />;

  if (!items.length) {
    return (
      <div className="text-center py-20">
        <XCircle size={48} className="text-emerald-500 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-vs-text-primary text-lg">No rejected properties</h3>
        <p className="text-vs-text-secondary text-sm mt-1">All properties are in good standing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">
          Rejected Properties
          <span className="text-vs-text-secondary font-normal text-base ml-2">({items.length})</span>
        </h2>
        <button onClick={load} className="btn-outline !py-2 !text-sm flex items-center gap-2">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {items.map((p) => (
        <div key={p.id} className="card overflow-hidden border-l-4 border-l-red-400">
          {/* Image strip */}
          {p.images?.length > 0 && (
            <div className="flex gap-2 p-3 bg-vs-bg overflow-x-auto">
              {p.images.slice(0, 5).map((img, i) => (
                <img key={i} src={img.url} alt="" className="h-24 w-36 object-cover rounded-lg shrink-0" />
              ))}
            </div>
          )}

          <div className="p-5">
            <div className="flex flex-wrap gap-4 justify-between">
              {/* Left: details */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="chip">{CATEGORY_LABEL?.[p.category] || p.category}</span>
                  {p.sub_category && <span className="chip">{p.sub_category}</span>}
                  <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 font-medium">
                    Rejected
                  </span>
                </div>

                <h3 className="font-display font-semibold text-vs-text-primary text-lg leading-snug">
                  {p.title}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm mt-2">
                  <InfoRow icon={User}     label="Seller"   value={p.listed_by_name || "—"} />
                  <InfoRow icon={MapPin}   label="Location" value={`${p.location?.city || "—"}, ${p.location?.state || "—"}`} />
                  <InfoRow icon={Calendar} label="Submitted" value={new Date(p.created_at).toLocaleDateString("en-IN")} />
                </div>

                <div className="text-sm font-semibold text-vs-text-primary mt-1">
                  {INR(p.price)}
                </div>

                {/* Rejection reason */}
                {p.rejection_reason && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">
                        Reason for Rejection
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-300">{p.rejection_reason}</div>
                    </div>
                  </div>
                )}

                {p.updated_at && (
                  <div className="text-xs text-vs-text-muted mt-1">
                    Rejected on: {new Date(p.updated_at).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => restore(p.id)}
                  disabled={busy[p.id]}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-vs-border text-vs-text-secondary hover:bg-vs-bg hover:text-vs-gold text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {busy[p.id] ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Restore to Pending
                </button>
                <button
                  onClick={() => approve(p.id)}
                  disabled={busy[p.id]}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 size={13} /> Approve Directly
                </button>
                <button
                  onClick={() => remove(p.id, p.title)}
                  disabled={busy[p.id]}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  <Trash2 size={13} /> Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-1.5">
    <Icon size={13} className="text-vs-text-secondary mt-0.5 shrink-0" />
    <div>
      <span className="text-vs-text-secondary text-xs">{label}: </span>
      <span className="text-vs-text-primary text-xs">{value}</span>
    </div>
  </div>
);

const Spin = () => (
  <div className="py-16 flex justify-center">
    <Loader2 className="animate-spin text-vs-gold" size={24} />
  </div>
);
