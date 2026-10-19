import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, ArrowLeft, Loader2, BadgeCheck, Calendar, Building2,
  Ruler, DollarSign, Phone, Mail, MessageSquare, ImageIcon, CheckCircle2,
  ExternalLink, Home, FileDown
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";
import toast from "react-hot-toast";
import { fadeUp, stagger, viewportOnce } from "@/lib/animations";
import BrochureModal from "@/components/BrochureModal";

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

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [enquiry, setEnquiry] = useState({ name: "", email: "", phone: "", message: "", contact_preference: "call" });
  const [sending, setSending] = useState(false);
  const [brochureOpen, setBrochureOpen] = useState(false);

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then(({ data }) => setP(data))
      .catch(() => { toast.error("Project not found"); navigate("/"); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const submitEnquiry = async (e) => {
    e.preventDefault();
    if (!enquiry.name || !enquiry.email || !enquiry.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSending(true);
    try {
      await api.post("/enquiries", { ...enquiry, project_id: id, message: enquiry.message || `Enquiry about project: ${p?.title}` });
      toast.success("Enquiry sent! Our team will reach out shortly.");
      setEnquiry({ name: "", email: "", phone: "", message: "", contact_preference: "call" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send enquiry");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-vs-gold" size={32} />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-vs-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <Home size={48} className="text-vs-text-muted mb-4" />
          <h2 className="font-display font-medium text-vs-text-primary text-2xl">Project not found</h2>
          <Link to="/" className="btn-primary mt-8">Back to Home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Build image gallery from available sources
  const images = p.images?.length
    ? p.images.map((img) => (typeof img === "string" ? img : img.url))
    : p.image_url ? [p.image_url] : [];

  const amenities = p.amenities || [];
  const highlights = p.highlights || [];

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-0 bg-vs-bg">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-vs-text-muted hover:text-vs-gold transition-colors duration-300 mb-6"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>

        {/* Main image */}
        {images.length > 0 && (
          <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
            <div className="relative rounded-2xl overflow-hidden border border-vs-border bg-vs-surface">
              <motion.img
                key={activeImg}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                src={images[activeImg]}
                alt={p.title}
                className="w-full aspect-[21/9] object-cover"
              />
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                {p.rera_id && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vs-gold text-vs-bg text-[11px] font-medium">
                    <BadgeCheck size={12} /> RERA Approved
                  </span>
                )}
                {p.type === "new" && (
                  <span className="px-3 py-1.5 rounded-full bg-vs-primary text-white text-[11px] font-medium">
                    New Launch
                  </span>
                )}
                {p.status && (
                  <span className="px-3 py-1.5 rounded-full bg-vs-surface/90 border border-vs-border text-vs-text-primary text-[11px] font-medium backdrop-blur-sm capitalize">
                    {p.status}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      activeImg === i ? "border-vs-gold" : "border-vs-border hover:border-vs-gold/50"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Content */}
      <motion.div
        className="max-w-[80rem] mx-auto px-6 lg:px-12 py-10 grid lg:grid-cols-12 gap-10"
        initial="hidden"
        animate="visible"
        variants={stagger()}
      >
        {/* LEFT */}
        <div className="lg:col-span-8 space-y-8">

          {/* Title + metadata */}
          <motion.div variants={fadeUp}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-vs-gold flex items-center gap-2 mb-3">
              {SECTOR_LABELS[p.sector] || p.sector}
              {p.builder && <> · {p.builder}</>}
            </div>
            <h1 className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
              {p.title}
            </h1>
            <div className="mt-3 flex items-center gap-2 text-vs-text-secondary text-sm">
              <MapPin size={14} className="text-vs-gold shrink-0" />
              {[p.location, p.city, p.state].filter(Boolean).join(", ")}
            </div>
          </motion.div>

          {/* Key stats grid */}
          <motion.div variants={stagger()} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {p.price_range && (
              <StatCard icon={DollarSign} label="Price Range" value={p.price_range} />
            )}
            {p.area && (
              <StatCard icon={Ruler} label="Area" value={p.area} />
            )}
            {p.possession && (
              <StatCard icon={Calendar} label="Possession" value={p.possession} />
            )}
            {(p.builder || p.developer) && (
              <StatCard icon={Building2} label="Builder" value={p.builder || p.developer} />
            )}
          </motion.div>

          {/* Description */}
          {p.description && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="About this Project">
                <p className="text-vs-text-secondary leading-relaxed whitespace-pre-line">{p.description}</p>
              </Section>
            </motion.div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="Project Highlights">
                <ul className="space-y-2">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 text-vs-text-secondary text-sm">
                      <CheckCircle2 size={16} className="text-vs-gold shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>
              </Section>
            </motion.div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="Amenities">
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="chip">{a}</span>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* RERA info */}
          {p.rera_id && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="RERA Information">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-vs-surface border border-vs-border">
                  <BadgeCheck size={20} className="text-vs-gold shrink-0" />
                  <div>
                    <div className="text-xs text-vs-text-muted uppercase tracking-wider mb-1">RERA Registration No.</div>
                    <div className="font-display font-medium text-vs-text-primary">{p.rera_id}</div>
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {/* Location */}
          {(p.location || p.city) && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="Location">
                <div className="p-4 rounded-xl bg-vs-surface border border-vs-border flex items-start gap-3">
                  <MapPin size={18} className="text-vs-gold shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-vs-text-primary">
                      {[p.location, p.city, p.state].filter(Boolean).join(", ")}
                    </div>
                    {p.nearby && (
                      <p className="mt-1 text-sm text-vs-text-muted">{p.nearby}</p>
                    )}
                  </div>
                </div>
              </Section>
            </motion.div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <motion.aside variants={fadeUp} className="lg:col-span-4">
          <div className="sticky top-24 card overflow-hidden">
            <div className="p-5 border-b border-vs-border">
              <h3 className="font-display font-medium text-vs-text-primary text-lg">Enquire About This Project</h3>
              <p className="mt-1 text-sm text-vs-text-muted">Zero brokerage. Our team connects you directly.</p>
              {p.price_range && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-vs-text-muted mb-1">Starting From</div>
                  <div className="font-display text-2xl font-medium text-vs-gold">{p.price_range}</div>
                </div>
              )}
            </div>

            <form onSubmit={submitEnquiry} className="p-5 space-y-4">
              <input
                className="input-field"
                required
                placeholder="Your name *"
                value={enquiry.name}
                onChange={(e) => setEnquiry((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                className="input-field"
                type="email"
                required
                placeholder="Email *"
                value={enquiry.email}
                onChange={(e) => setEnquiry((s) => ({ ...s, email: e.target.value }))}
              />
              <input
                className="input-field"
                required
                placeholder="Phone *"
                value={enquiry.phone}
                onChange={(e) => setEnquiry((s) => ({ ...s, phone: e.target.value }))}
              />
              <textarea
                className="input-field min-h-[80px]"
                placeholder="Your message (optional)"
                value={enquiry.message}
                onChange={(e) => setEnquiry((s) => ({ ...s, message: e.target.value }))}
              />

              <div>
                <label className="text-xs text-vs-text-muted uppercase tracking-wider mb-2 block">Preferred contact</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "call", l: "Call", Icon: Phone },
                    { v: "email", l: "Email", Icon: Mail },
                    { v: "whatsapp", l: "WhatsApp", Icon: MessageSquare },
                  ].map(({ v, l, Icon }) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setEnquiry((s) => ({ ...s, contact_preference: v }))}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs transition-all duration-300 ${
                        enquiry.contact_preference === v
                          ? "border-vs-gold text-vs-gold bg-vs-gold/10"
                          : "border-vs-border text-vs-text-muted hover:border-vs-gold/50"
                      }`}
                    >
                      <Icon size={14} />
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full justify-center"
              >
                {sending ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
                Send Enquiry
              </button>

              <button
                type="button"
                onClick={() => setBrochureOpen(true)}
                className="btn-primary w-full justify-center flex items-center gap-1.5"
              >
                <FileDown size={14} /> Download Brochure
              </button>
            </form>
          </div>
        </motion.aside>
      </motion.div>

      <Footer />

      {brochureOpen && p && (
        <BrochureModal
          property={p}
          onClose={() => setBrochureOpen(false)}
          endpoint="/brochure/project-download"
          idField="project_id"
        />
      )}
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="pt-6 border-t border-vs-border">
    <h3 className="font-display font-medium text-vs-text-primary text-xl mb-4">{title}</h3>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="card p-4">
    <Icon size={18} className="text-vs-gold" />
    <div className="mt-2 text-[10px] uppercase tracking-wider text-vs-text-muted">{label}</div>
    <div className="font-display font-medium text-vs-text-primary mt-1 text-sm leading-snug">{value}</div>
  </div>
);

export default ProjectDetail;
