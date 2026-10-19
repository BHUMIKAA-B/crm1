import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, MessageSquare, MapPin, User, Calendar, X, AlertCircle } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";
import { INR, formatArea, CATEGORY_LABEL } from "@/utils/format";

/* ── Rejection reason modal ─────────────────────────────────────────────── */
const REJECT_REASONS = [
  "Incomplete documents",
  "Incorrect pricing",
  "Duplicate listing",
  "Poor image quality",
  "Location mismatch",
  "Other",
];

function RejectModal({ property, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");

  const finalReason = reason === "Other" ? custom.trim() : reason;

  const submit = (e) => {
    e.preventDefault();
    if (!finalReason) { toast.error("Please select or enter a rejection reason"); return; }
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="modal-panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-vs-border">
          <div>
            <h3 className="font-display font-semibold text-vs-text-primary">Reject Property</h3>
            <p className="text-xs text-vs-text-muted mt-0.5 line-clamp-1">{property.title}</p>
          </div>
          <button onClick={onClose} className="text-vs-text-muted hover:text-vs-text-primary transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">
              The seller will be notified with this rejection reason. It will also be stored for reference.
            </p>
          </div>

          <div>
            <label className="label">Reason for Rejection *</label>
            <div className="space-y-2">
              {REJECT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="reject_reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="text-sm text-vs-text-primary group-hover:text-vs-gold transition-colors">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {reason === "Other" && (
            <div>
              <label className="label">Specify reason *</label>
              <textarea
                className="input-field min-h-[80px]"
                placeholder="Describe the issue in detail…"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center !py-2.5">Cancel</button>
            <button
              type="submit"
              disabled={!finalReason}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <XCircle size={14} /> Reject Property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function AdminApprovals({ onAction }) {
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [busy,          setBusy]          = useState({});
  const [rejectTarget,  setRejectTarget]  = useState(null); // property being rejected

  // Modal state
  const [modal, setModal] = useState(null); // { type: "reject"|"changes", id, title }
  const [modalMsg, setModalMsg] = useState("");
  const [modalBusy, setModalBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/admin/properties/pending")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const act = async (id, fn) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try { await fn(); load(); onAction?.(); }
    finally { setBusy((b) => ({ ...b, [id]: false })); }
  };

  const approve = (id) =>
    act(id, async () => {
      await api.put(`/admin/properties/${id}/verify`, { notes: "" });
      toast.success("Property approved and published");
    });

  const confirmReject = async (reason) => {
    const { id, title } = rejectTarget;
    setRejectTarget(null);
    await act(id, async () => {
      await api.put(`/admin/properties/${id}/reject`, { reason });
      toast.success(`"${title}" rejected`);
    });
  };

  const openRequestChanges = (id, title) => {
    setModal({ type: "changes", id, title });
    setModalMsg("Please review and resubmit your listing with the following changes:");
  };

  const closeModal = () => {
    setModal(null);
    setModalMsg("");
  };

  const submitModal = async () => {
    if (!modalMsg.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setModalBusy(true);
    try {
      if (modal.type === "reject") {
        await api.put(`/admin/properties/${modal.id}/reject`, { reason: modalMsg });
        toast.success("Property rejected");
      } else {
        await api.put(`/admin/properties/${modal.id}/request-changes`, { message: modalMsg });
        toast.success("Change request sent to seller");
      }
      closeModal();
      load();
      onAction?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Action failed");
    } finally {
      setModalBusy(false);
    }
  };

  if (loading) return <Spin />;

  if (!items.length) {
    return (
      <div className="text-center py-20">
        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-vs-text-primary text-lg">Queue is clear!</h3>
        <p className="text-vs-text-secondary text-sm mt-1">No properties pending approval.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-vs-text-primary text-xl">
            Property Approval <span className="text-vs-text-secondary font-normal text-base">({items.length} pending)</span>
          </h2>
        </div>

        {items.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {p.images?.length > 0 && (
              <div className="flex gap-2 p-3 bg-vs-bg overflow-x-auto">
                {p.images.slice(0, 5).map((img, i) => (
                  <img key={i} src={img.url} alt="" className="h-28 w-44 object-cover rounded-lg shrink-0" />
                ))}
              </div>
            )}

            <div className="p-5">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="chip">{CATEGORY_LABEL?.[p.category] || p.category}</span>
                    {p.sub_category && <span className="chip">{p.sub_category}</span>}
                    {p.furnishing   && <span className="chip">{p.furnishing}</span>}
                  </div>
                  <h3 className="font-display font-semibold text-vs-text-primary text-lg leading-snug">{p.title}</h3>
                  <p className="text-sm text-vs-text-secondary line-clamp-2">{p.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm mt-2">
                    <InfoRow icon={User}     label="Seller"   value={p.listed_by_name || "—"} />
                    <InfoRow icon={MapPin}   label="Location" value={`${p.location?.city || "—"}, ${p.location?.state || "—"}`} />
                    <InfoRow icon={Calendar} label="Uploaded" value={new Date(p.created_at).toLocaleDateString("en-IN")} />
                    {p.location?.address && <InfoRow icon={MapPin} label="Address" value={p.location.address} />}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm mt-1">
                    <span className="font-semibold text-vs-text-primary">{INR(p.price)}</span>
                    {p.area     && <span className="text-vs-text-secondary">{formatArea(p.area)}</span>}
                    {p.bedrooms && <span className="text-vs-text-secondary">{p.bedrooms} BHK</span>}
                    {p.facing   && <span className="text-vs-text-secondary">{p.facing} facing</span>}
                  </div>
                  {p.amenities?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.amenities.slice(0, 6).map((a) => (
                        <span key={a} className="text-[11px] bg-vs-bg text-vs-text-secondary border border-vs-border px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                      {p.amenities.length > 6 && <span className="text-[11px] text-vs-text-secondary">+{p.amenities.length - 6} more</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => approve(p.id)}
                    disabled={busy[p.id]}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {busy[p.id] ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectTarget({ id: p.id, title: p.title })}
                    disabled={busy[p.id]}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => openRequestChanges(p.id, p.title)}
                    disabled={busy[p.id]}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-vs-border text-vs-text-secondary hover:text-vs-text-primary hover:bg-vs-bg text-sm transition-colors disabled:opacity-60"
                  >
                    <MessageSquare size={14} /> Request Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rejectTarget && (
        <RejectModal
          property={rejectTarget}
          onConfirm={confirmReject}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-vs-surface border border-vs-border rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-vs-text-primary text-lg">Request Changes</h3>
                <p className="text-sm text-vs-text-muted mt-1 line-clamp-1">{modal.title}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-vs-bg text-vs-text-muted hover:text-vs-text-primary transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="mb-4">
              <label className="text-xs text-vs-text-muted uppercase tracking-wider mb-2 block">Feedback for seller</label>
              <textarea
                className="input-field min-h-[120px]"
                placeholder="Describe what changes are needed before approval..."
                value={modalMsg}
                onChange={(e) => setModalMsg(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} disabled={modalBusy} className="flex-1 btn-secondary justify-center">Cancel</button>
              <button
                onClick={submitModal}
                disabled={modalBusy || !modalMsg.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 bg-vs-primary hover:bg-vs-primary-hover text-white"
              >
                {modalBusy && <Loader2 size={14} className="animate-spin" />}
                Send Feedback
              </button>
            </div>
            <p className="mt-3 text-xs text-vs-text-muted text-center">
              The seller will be notified and the listing status will be updated to "Changes Requested".
            </p>
          </div>
        </div>
      )}
    </>
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
