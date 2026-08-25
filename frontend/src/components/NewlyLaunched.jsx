import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowUpRight, BadgeCheck, Sparkles, X, Loader2, Phone, Mail, MessageSquare } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const SECTOR_LABELS = {
  apartment: "Apartments",
  commercial: "Commercial",
  residential: "Residential",
  plot: "Plots & Land",
  agriculture: "Agriculture",
  rental: "Rentals",
  industrial: "Industrial",
  construction_interior: "Construction & Interiors",
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

/* ── Enquiry Modal ─────────────────────────────────────────────────────────── */
function EnquiryModal({ project, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", contact_preference: "call" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/project-enquiries", {
        project_id: project.id,
        project_title: project.title,
        project_location: `${project.location || ""}, ${project.city || ""}`.replace(/^,\s*/, ""),
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        message: form.message,
        contact_preference: form.contact_preference,
      });
      toast.success("Enquiry submitted! We'll be in touch soon.");
      onClose();
    } catch {
      toast.error("Could not submit enquiry. Please try again.");
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
            <h3 className="font-display font-semibold text-vs-text-primary">Enquire About Project</h3>
            <p className="text-xs text-vs-text-muted mt-0.5 line-clamp-1">{project.title}</p>
            {project.city && (
              <p className="text-xs text-vs-text-muted flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {project.location ? `${project.location}, ` : ""}{project.city}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-vs-text-muted hover:text-vs-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input-field" placeholder="Your name" value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input className="input-field" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} required />
            </div>
          </div>
          <div>
            <label className="label">Email <span className="text-vs-text-muted font-normal">(optional)</span></label>
            <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label">Message <span className="text-vs-text-muted font-normal">(optional)</span></label>
            <textarea className="input-field min-h-[70px]" placeholder="I'd like to know more about this project…" value={form.message} onChange={set("message")} />
          </div>
          <div>
            <label className="label">Preferred Contact</label>
            <div className="flex gap-2">
              {[
                { v: "call",      label: "Call",      Icon: Phone },
                { v: "whatsapp",  label: "WhatsApp",  Icon: MessageSquare },
                { v: "email",     label: "Email",     Icon: Mail },
              ].map(({ v, label, Icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, contact_preference: v }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    form.contact_preference === v
                      ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                      : "border-vs-border text-vs-text-secondary hover:border-vs-gold/50"
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center !py-2.5">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center !py-2.5 flex items-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
              {loading ? "Submitting…" : "Submit Enquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
const NewlyLaunched = () => {
  const [items, setItems] = useState([]);
  const [enquiryProject, setEnquiryProject] = useState(null);

  useEffect(() => {
    api.get("/projects", { params: { type: "new" } })
      .then(({ data }) => setItems(data || []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      <section
        data-testid="newly-launched-section"
        className="py-20 md:py-24 bg-vs-surface border-y border-vs-border"
      >
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="flex items-end justify-between gap-4 flex-wrap mb-10"
          >
            <motion.div variants={fadeUp}>
              <div className="eyebrow flex items-center gap-2 text-vs-gold mb-3">
                <Sparkles size={13} />
                Newly Launched
              </div>
              <h2 className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
                Just landed on VisitSarva.
              </h2>
              <p className="mt-3 text-vs-text-secondary text-sm md:text-base max-w-lg">
                Fresh projects from trusted builders — see them before the rest of the market.
              </p>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Link
                to="/properties"
                className="text-sm text-vs-text-secondary hover:text-vs-gold flex items-center gap-2 transition-colors duration-300 group"
              >
                View all listings
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {items.map((p) => (
              <motion.article
                key={p.id}
                data-testid={`new-project-${p.id}`}
                variants={fadeUp}
                className="card relative group overflow-hidden"
              >
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1.5 text-[10px] tracking-wider uppercase rounded bg-vs-gold text-vs-bg font-medium shadow-glow-sm flex items-center gap-1.5">
                    <Sparkles size={11} /> New Launch
                  </span>
                </div>
                <div className="aspect-[16/10] overflow-hidden bg-vs-bg">
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-vs-text-muted">
                    <span className="chip !py-1 !px-2.5 !text-[10px]">
                      {SECTOR_LABELS[p.sector] || p.sector}
                    </span>
                    {p.rera_id && (
                      <span className="flex items-center gap-1 text-[10px]">
                        <BadgeCheck size={11} className="text-vs-gold" /> RERA
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display font-medium text-vs-text-primary text-lg leading-snug group-hover:text-vs-gold transition-colors duration-300">
                    {p.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-vs-text-muted">
                    <MapPin size={12} className="text-vs-gold" /> {p.location}, {p.city}
                  </div>
                  <div className="mt-5 pt-4 border-t border-vs-border">
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-vs-text-muted mb-1">Price</div>
                      <div className="font-display font-medium text-vs-gold">{p.price_range}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/projects/${p.id}`}
                        className="btn-secondary text-xs px-4 py-2 flex-1 justify-center"
                        data-testid={`view-details-${p.id}`}
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => setEnquiryProject(p)}
                        className="btn-primary text-xs px-4 py-2 flex-1 justify-center inline-flex items-center gap-1.5"
                        data-testid={`enquire-${p.id}`}
                      >
                        Enquire <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {enquiryProject && (
        <EnquiryModal project={enquiryProject} onClose={() => setEnquiryProject(null)} />
      )}
    </>
  );
};

export default NewlyLaunched;
