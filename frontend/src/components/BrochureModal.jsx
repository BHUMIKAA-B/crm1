import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X, Download, Loader2 } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

export default function BrochureModal({ property, onClose, endpoint = "/brochure/download", idField = "property_id" }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(
        endpoint,
        { [idField]: property.id, name: form.name, phone: form.phone, email: form.email || undefined },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `VisitSarva-${property.title?.slice(0, 40).replace(/\s+/g, "_") || "Brochure"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Brochure downloaded!");
      onClose();
    } catch {
      toast.error("Could not generate brochure. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-panel w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-vs-border">
          <div>
            <h3 className="font-display font-semibold text-vs-text-primary">Download Brochure</h3>
            <p className="text-xs text-vs-text-muted mt-0.5 line-clamp-1">{property.title}</p>
          </div>
          <button onClick={onClose} className="text-vs-text-muted hover:text-vs-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-vs-text-secondary">
            Enter your details to receive the property brochure.
          </p>
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input-field"
              placeholder="Your full name"
              value={form.name}
              onChange={set("name")}
              required
            />
          </div>
          <div>
            <label className="label">Phone Number *</label>
            <input
              className="input-field"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={set("phone")}
              required
            />
          </div>
          <div>
            <label className="label">Email <span className="text-vs-text-muted font-normal">(optional)</span></label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center !py-2.5">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center !py-2.5 flex items-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {loading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
