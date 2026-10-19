import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, HardHat, Sofa, Hammer, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

const CONSTRUCTION_TYPES = [
  { v: "new_construction", l: "New Construction" },
  { v: "renovation", l: "Renovation" },
  { v: "interior", l: "Interior Design" },
  { v: "commercial_fit_out", l: "Commercial Fit-out" },
  { v: "other", l: "Other" },
];

// A reliable hosted real-estate / construction loop video (Pexels CDN)
const HERO_VIDEO =
  "https://videos.pexels.com/video-files/3209298/3209298-uhd_2560_1440_25fps.mp4";

const Construction = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    land_size: "",
    construction_type: "new_construction",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/enquiry", form);
      toast.success("Thank you — our construction team will call within 24 hours.");
      setForm({
        name: "", phone: "", email: "", location: "", land_size: "",
        construction_type: "new_construction", notes: "",
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />

      {/* HERO with video */}
      <section className="relative h-[78vh] overflow-hidden" data-testid="construction-hero">
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1920&auto=format&fit=crop&q=80"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#171717]/85 via-[#171717]/55 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 h-full flex items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-2xl text-white">
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#A9CBE3] mb-4">
              Sarva Construction & Interiors
            </div>
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
              Build it once.
              <br />
              <span className="text-[#A9CBE3]">Build it right.</span>
            </h1>
            <p className="mt-5 text-white/85 text-base md:text-lg max-w-lg leading-relaxed">
              End-to-end design, build and interiors for homes, offices and retail.
              From the foundation slab to the curtains — one accountable team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {[
            { Icon: HardHat, title: "Architecture & Design", body: "Concept-to-completion design including 3D walkthroughs and material moodboards." },
            { Icon: Hammer, title: "Construction", body: "RCC, structural and finishing work supervised by in-house civil engineers." },
            { Icon: Sofa, title: "Interiors", body: "Modular kitchens, wardrobes, lighting, and full furniture packages." },
          ].map((p) => (
            <div key={p.title} className="card p-7">
              <p.Icon size={28} className="text-vs-gold" strokeWidth={1.5} />
              <h3 className="mt-5 font-display font-semibold text-xl text-vs-text-primary">{p.title}</h3>
              <p className="mt-2 text-sm text-vs-text-secondary leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG-STYLE SHOWCASE */}
      <section className="py-16 md:py-20 bg-vs-bg border-y border-vs-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <div className="eyebrow mb-2">Recent Projects</div>
            <h2 className="section-title">Spaces we've built.</h2>
          </div>
          <div className="grid md:grid-cols-12 gap-6">
            <Showcase
              className="md:col-span-7"
              img="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80"
              tag="Residential"
              title="4 BHK contemporary villa — Sarjapur"
              body="3,800 sqft minimalist villa with warm Indian craft details. Completed in 11 months. Project lead: Sarva Build."
            />
            <Showcase
              className="md:col-span-5"
              img="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80"
              tag="Interiors"
              title="Founder's office, HSR Layout"
              body="1,200 sqft head-office with walnut floors and acoustic ceilings."
            />
            <Showcase
              className="md:col-span-5"
              img="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop&q=80"
              tag="Renovation"
              title="1960s heritage bungalow restored"
              body="Structural strengthening + modern infrastructure inside heritage walls."
            />
            <Showcase
              className="md:col-span-7"
              img="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80"
              tag="Commercial"
              title="Retail fit-out — high street Bangalore"
              body="2,400 sqft retail experience centre with full MEP and brand-led interiors."
            />
          </div>
        </div>
      </section>

      {/* MATERIAL HIGHLIGHTS */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="eyebrow mb-2">Materials & Standards</div>
            <h2 className="section-title">Specs you won't have to chase.</h2>
            <p className="mt-4 text-vs-text-secondary text-sm md:text-base leading-relaxed">
              Every Sarva build uses traceable, branded materials with written warranties — from the steel
              to the switch plates. Quantity surveying is in-house, so margins stay where they belong.
            </p>
          </div>
          <div className="md:col-span-7 grid grid-cols-2 gap-3">
            {[
              ["Cement", "Ultratech / ACC"],
              ["Steel", "Tata / Vizag — Fe 550D"],
              ["Wiring", "Polycab / Havells"],
              ["Sanitary", "Jaquar / Kohler"],
              ["Tiles", "Kajaria / Somany"],
              ["Paint", "Asian Paints — Royale"],
            ].map(([k, v]) => (
              <div key={k} className="card p-4">
                <div className="text-[10px] uppercase tracking-wider text-vs-text-secondary">{k}</div>
                <div className="font-display font-semibold text-vs-text-primary mt-1 text-sm">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENQUIRY FORM */}
      <section id="enquire" className="py-20 md:py-24 bg-[#171717] text-white" data-testid="construction-enquiry">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#A9CBE3] mb-3">
              Start your build
            </div>
            <h2 className="font-display font-bold text-3xl md:text-4xl leading-tight">
              Tell us about your project.
            </h2>
            <p className="mt-4 text-white/75 text-sm md:text-base leading-relaxed">
              Share a few details and our construction team will reach out within 24 hours
              with an indicative scope, timeline and budget range.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
              {[
                ["18+", "Years of practice"],
                ["240+", "Projects delivered"],
                ["12", "Cities served"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-2xl font-bold text-[#A9CBE3]">{n}</div>
                  <div className="text-white/60 uppercase tracking-wider mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="md:col-span-7 bg-vs-surface rounded-xl p-6 md:p-8 text-vs-text-primary" data-testid="construction-form">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name *">
                <input className="input-field" required value={form.name} onChange={set("name")} data-testid="cons-name" />
              </Field>
              <Field label="Phone *">
                <input className="input-field" required value={form.phone} onChange={set("phone")} data-testid="cons-phone" />
              </Field>
              <Field label="Email">
                <input className="input-field" type="email" value={form.email} onChange={set("email")} data-testid="cons-email" />
              </Field>
              <Field label="Location *">
                <input className="input-field" required value={form.location} onChange={set("location")} placeholder="City / area" data-testid="cons-location" />
              </Field>
              <Field label="Size of land">
                <input className="input-field" value={form.land_size} onChange={set("land_size")} placeholder="e.g. 2400 sqft" data-testid="cons-land-size" />
              </Field>
              <Field label="Type of construction">
                <select className="input-field" value={form.construction_type} onChange={set("construction_type")} data-testid="cons-type">
                  {CONSTRUCTION_TYPES.map((t) => (
                    <option key={t.v} value={t.v}>{t.l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Brief description" className="sm:col-span-2">
                <textarea className="input-field min-h-[100px]" value={form.notes} onChange={set("notes")} placeholder="Project scope, timeline, anything special…" data-testid="cons-notes" />
              </Field>
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-5" data-testid="cons-submit">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              Send Enquiry
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const Showcase = ({ className, img, tag, title, body }) => (
  <article className={`card overflow-hidden group ${className}`}>
    <div className="aspect-[16/10] overflow-hidden">
      <img src={img} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
    </div>
    <div className="p-5">
      <span className="text-[10px] uppercase tracking-wider text-vs-gold font-semibold">{tag}</span>
      <h3 className="mt-2 font-display font-semibold text-vs-text-primary text-lg leading-snug">{title}</h3>
      <p className="mt-1.5 text-sm text-vs-text-secondary leading-relaxed">{body}</p>
    </div>
  </article>
);

const Field = ({ label, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="label">{label}</span>
    {children}
  </label>
);

export default Construction;
