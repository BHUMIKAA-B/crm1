import React, { useState } from "react";
import toast from "react-hot-toast";
import { X, Loader2, Sparkles } from "lucide-react";
import api from "@/api/client";

const ValuationModal = ({ open, onClose }) => {
  const [form, setForm] = useState({ name: "", phone: "", address: "", property_type: "residential" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/valuation", form);
      toast.success("Done! Our valuation specialist will call you within one business day.");
      onClose?.();
      setForm({ name: "", phone: "", address: "", property_type: "residential" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      data-testid="valuation-modal"
    >
      <div
        className="modal-panel max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-vs-text-secondary hover:text-vs-text-primary" aria-label="Close" data-testid="valuation-close">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2 text-vs-gold">
          <Sparkles size={16} />
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Free · No obligation</span>
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-vs-text-primary mt-2">
          Get a free property valuation
        </h2>
        <p className="mt-2 text-sm text-vs-text-secondary">
          Our specialist will call you with a market-honest estimate within one business day.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3" data-testid="valuation-form">
          <input className="input-field" required placeholder="Your name" value={form.name} onChange={set("name")} data-testid="valuation-name" />
          <input className="input-field" required placeholder="Phone number" value={form.phone} onChange={set("phone")} data-testid="valuation-phone" />
          <input className="input-field" required placeholder="Property address" value={form.address} onChange={set("address")} data-testid="valuation-address" />
          <select className="input-field" value={form.property_type} onChange={set("property_type")} data-testid="valuation-type">
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="plot">Plot / Land</option>
            <option value="agriculture">Agricultural</option>
            <option value="industrial">Industrial</option>
          </select>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center" data-testid="valuation-submit">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Request my valuation
          </button>
        </form>
        <p className="mt-4 text-[11px] text-vs-text-secondary text-center">
          We respect your privacy. No spam, no broker calls.
        </p>
      </div>
    </div>
  );
};

export default ValuationModal;
