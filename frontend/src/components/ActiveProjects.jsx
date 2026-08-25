import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import api from "@/api/client";
import { PROPERTY_CATEGORIES } from "@/utils/format";

const ALL_TABS = [{ value: "all", label: "All" }, ...PROPERTY_CATEGORIES.slice(0, 6)];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const ActiveProjects = () => {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    api.get("/projects", { params: { type: "active" } }).then(({ data }) => setItems(data || [])).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (tab === "all" ? items : items.filter((p) => p.sector === tab)),
    [items, tab]
  );

  if (items.length === 0) return null;

  const featured = filtered[0];
  const rest = filtered.slice(1, 4);

  return (
    <section
      data-testid="active-projects-section"
      className="py-20 md:py-24 bg-vs-bg border-y border-vs-border"
    >
      <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="flex items-end justify-between gap-4 flex-wrap mb-8"
        >
          <motion.div variants={fadeUp}>
            <div className="eyebrow text-vs-gold mb-3">Currently Marketing</div>
            <h2 className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
              Projects we're working with.
            </h2>
            <p className="mt-3 text-vs-text-secondary text-sm md:text-base max-w-xl">
              Active developments where our team is the appointed marketing partner.
            </p>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-1"
        >
          {ALL_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              data-testid={`active-tab-${t.value}`}
              className={`chip whitespace-nowrap ${tab === t.value ? "chip-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </motion.div>

        {!featured ? (
          <div className="text-vs-text-muted py-8">No active projects in this category.</div>
        ) : (
          <div className="grid lg:grid-cols-10 gap-5">
            {/* Featured 70% */}
            <motion.article
              key={featured.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-7 card overflow-hidden group"
              data-testid={`active-featured-${featured.id}`}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={featured.image_url}
                  alt={featured.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-vs-bg via-vs-bg/40 to-transparent" />
                <span className="absolute top-4 left-4 px-3 py-1.5 text-[10px] tracking-wider uppercase rounded bg-vs-gold text-vs-bg font-medium">
                  Featured Project
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="text-[11px] tracking-[0.2em] uppercase text-vs-gold flex items-center gap-2">
                    {featured.builder} · <MapPin size={11} /> {featured.location}, {featured.city}
                  </div>
                  <h3 className="mt-2 font-display font-medium text-vs-text-primary text-2xl md:text-4xl leading-tight">
                    {featured.title}
                  </h3>
                  <p className="mt-3 text-vs-text-secondary text-sm max-w-2xl">{featured.description}</p>
                  <div className="mt-5 flex items-center gap-6 flex-wrap text-xs">
                    <span>
                      <div className="text-vs-text-muted text-[10px] uppercase tracking-wider">Price</div>
                      <div className="font-display font-medium text-vs-text-primary mt-0.5">{featured.price_range}</div>
                    </span>
                    <span>
                      <div className="text-vs-text-muted text-[10px] uppercase tracking-wider">Area</div>
                      <div className="font-display font-medium text-vs-text-primary mt-0.5">{featured.area}</div>
                    </span>
                    <span>
                      <div className="text-vs-text-muted text-[10px] uppercase tracking-wider">Possession</div>
                      <div className="font-display font-medium text-vs-text-primary mt-0.5">{featured.possession}</div>
                    </span>
                  </div>
                  <Link
                    to={`/projects/${featured.id}`}
                    className="mt-6 inline-flex items-center gap-2 bg-vs-gold hover:bg-vs-primary-hover px-5 py-2.5 rounded text-vs-bg text-sm font-medium transition-all duration-300"
                  >
                    View Details <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </motion.article>

            {/* Sidebar 30% */}
            <div className="lg:col-span-3 space-y-4">
              {rest.length === 0 ? (
                <div className="text-sm text-vs-text-muted">More projects coming soon.</div>
              ) : (
                rest.map((p) => (
                  <Link
                    to={`/projects/${p.id}`}
                    key={p.id}
                    data-testid={`active-side-${p.id}`}
                    className="card flex gap-3 overflow-hidden hover:border-vs-gold transition-all duration-300 group"
                  >
                    <div className="w-24 h-24 shrink-0 bg-vs-surface rounded-l-lg overflow-hidden">
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 py-3 pr-4">
                      <div className="text-[10px] uppercase tracking-wider text-vs-gold">
                        {p.area}
                      </div>
                      <div className="font-display font-medium text-vs-text-primary text-sm leading-snug line-clamp-2 group-hover:text-vs-gold transition-colors duration-300">
                        {p.title}
                      </div>
                      <div className="text-xs text-vs-text-muted mt-1 flex items-center gap-1.5">
                        <MapPin size={10} className="text-vs-gold" /> {p.city}
                      </div>
                      <div className="text-xs font-display font-medium text-vs-gold mt-1.5">
                        {p.price_range}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ActiveProjects;
