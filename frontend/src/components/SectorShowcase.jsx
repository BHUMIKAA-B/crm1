import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const SECTORS = [
  { key: "commercial", title: "Commercial", tagline: "Offices, retail, pre-leased income assets.", img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&auto=format&fit=crop&q=80" },
  { key: "residential", title: "Residential", tagline: "Villas, independent houses, builder floors.", img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop&q=80" },
  { key: "plot", title: "Plots & Agriculture", tagline: "DTCP-approved plots, farm land, plantations.", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80" },
  { key: "apartment", title: "Apartments", tagline: "1/2/3/4 BHK flats in gated communities.", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80" },
  { key: "industrial", title: "Industrial", tagline: "Warehouses, factories, logistics parks.", img: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80" },
  { key: "rental", title: "Rentals", tagline: "Furnished & semi-furnished homes for rent.", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80" },
  { key: "construction_interior", title: "Construction & Interiors", tagline: "Build-to-spec, premium interiors.", to: "/construction", img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80" },
  { key: "services", title: "All-in-One Documents", tagline: "Khata, valuation, conversions, approvals.", to: "/services", img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=80" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const SectorShowcase = () => (
  <section data-testid="sector-showcase" className="py-20 md:py-24 bg-vs-surface border-y border-vs-border">
    <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
        className="max-w-2xl mb-10"
      >
        <motion.div variants={fadeUp} className="eyebrow text-vs-gold mb-3">Eight Sectors</motion.div>
        <motion.h2 variants={fadeUp} className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
          Everything property-related, under one roof.
        </motion.h2>
      </motion.div>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {SECTORS.map((s) => {
          const target = s.to || `/properties?category=${s.key}`;
          return (
            <motion.div key={s.key} variants={fadeUp}>
              <Link
                to={target}
                data-testid={`sector-tile-${s.key}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-xl border border-vs-border hover:border-vs-gold transition-all duration-500"
              >
                <img
                  src={s.img}
                  alt={s.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-vs-bg via-vs-bg/50 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-vs-gold/10" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-display font-medium text-vs-text-primary text-lg md:text-xl group-hover:text-vs-gold transition-colors duration-300">
                    {s.title}
                  </h3>
                  <p className="text-xs text-vs-text-secondary mt-1.5 leading-relaxed">{s.tagline}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-vs-gold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    Explore <ArrowUpRight size={12} />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  </section>
);

export default SectorShowcase;
