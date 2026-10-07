import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Headphones as HeadphonesIcon, Ban, ArrowRight, BadgeCheck, CircleCheck as CheckCircle2, Sparkles, FileCheck, ScrollText, Compass, Building2, ClipboardCheck, Landmark, Star } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AISearchBar from "@/components/AISearchBar";
import PropertyCard from "@/components/PropertyCard";
import NewlyLaunched from "@/components/NewlyLaunched";
import ActiveProjects from "@/components/ActiveProjects";
import SectorShowcase from "@/components/SectorShowcase";
import ValuationModal from "@/components/ValuationModal";
import DocumentsDonutChart from "@/components/DocumentsDonutChart";
import api from "@/api/client";
import { PROPERTY_CATEGORIES } from "@/utils/format";
import { applyAccentColor } from "@/lib/theme";

const DEFAULT_HERO = {
  image_url:
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop&q=80",
  headline: "Buy Your Dream Property. Pay Zero Brokerage.",
  sub_headline:
    "Discover verified homes and commercial spaces directly from owners & premium builders — transparent, hassle-free, and 100% commission-free for buyers.",
  cta_text: "Explore Properties",
  cta_link: "/properties",
};

const DOCUMENT_SERVICES = [
  { v: "pre_registration", l: "Pre-Registration Assistance", body: "End-to-end help before sub-registrar: stamp duty, drafting, EC, encumbrance.", Icon: ScrollText },
  { v: "khata_assistance", l: "Khatha Assistance", body: "BBMP / GP Khata transfers, bifurcation, A-Khata conversion.", Icon: ClipboardCheck },
  { v: "property_valuation", l: "Property Valuation", body: "Market-honest valuation reports — for loans, sale, ITR or transfer.", Icon: FileCheck },
  { v: "land_approval", l: "Land Approval", body: "DTCT, BMRDA, BIAAPA layout approvals and revenue conversions.", Icon: Landmark },
  { v: "plan_approval", l: "Plan Approval", body: "Sanctioned plans, occupancy certificate, deviation regularisation.", Icon: Compass },
  { v: "property_conversion", l: "Property Conversion", body: "Agriculture → residential / commercial DC conversion.", Icon: Building2 },
  { v: "government_approval", l: "Government Approval", body: "NoCs, fire, environmental and statutory clearances.", Icon: ShieldCheck },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const Landing = () => {
  const [featured, setFeatured] = useState([]);
  const [howTab, setHowTab] = useState("buyer");
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [valuationOpen, setValuationOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(DOCUMENT_SERVICES[0].v);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start end", "end start"] });
  const heroCardY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const heroCardOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.6]);
  const heroImageScale = useTransform(scrollYProgress, [0, 1], [1, 1.04]);

  useEffect(() => {
    api.get("/properties/featured").then(({ data }) => setFeatured(data || [])).catch(() => {});
    api.get("/hero").then(({ data }) => {
      setHero({ ...DEFAULT_HERO, ...data });
      if (data?.accent_color) applyAccentColor(data.accent_color);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text-primary">
      <Navbar />

      <section
        ref={heroRef}
        id="hero"
        data-testid="hero-root"
        className="relative overflow-hidden pt-28 md:pt-36 pb-16 md:pb-24 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.88)), url(${hero.image_url})`,
        }}
      >
        {/* Decorative ambient lighting overlays */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-vs-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-vs-gold/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[80rem] mx-auto px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center min-h-[540px]">
            {/* Left Content Column */}
            <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6 text-white">
              {/* Trust Tag */}
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2.5 rounded-full bg-white/10 text-white border border-white/20 px-4 py-2 text-xs md:text-sm font-medium backdrop-blur-md shadow-lg">
                <BadgeCheck size={16} className="text-vs-gold" />
                <span>Zero Brokerage · 100% Verified Properties · Direct Owner Connect</span>
              </motion.div>

              {/* Main Headline & Subtitle */}
              <motion.div variants={fadeUp} className="space-y-4">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.15] tracking-tight text-white drop-shadow-sm">
                  {hero.headline || "Buy Your Dream Property. Pay Zero Brokerage."}
                </h1>
                <p className="max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-slate-200 font-normal">
                  {hero.sub_headline || "Discover verified homes and commercial spaces directly from owners & premium builders — transparent, hassle-free, and 100% commission-free for buyers."}
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 items-center pt-2">
                <Link
                  to={hero.cta_link || "/properties"}
                  data-testid="hero-cta-primary"
                  className="inline-flex items-center justify-center rounded-xl bg-vs-gold hover:bg-amber-400 text-slate-950 font-semibold px-7 py-3.5 text-sm md:text-base shadow-xl shadow-amber-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  {hero.cta_text || "Explore Properties"} <ArrowRight size={18} className="ml-2" />
                </Link>
                <Link
                  to="/loan-assistance"
                  data-testid="hero-cta-secondary"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3.5 text-sm md:text-base backdrop-blur-md transition-all hover:-translate-y-0.5"
                >
                  <Landmark size={18} className="mr-2 text-vs-gold" /> Home Loan Assistance
                </Link>
                <button
                  type="button"
                  onClick={() => setValuationOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-slate-900/40 hover:bg-slate-900/60 text-slate-300 font-medium px-5 py-3.5 text-sm backdrop-blur-md transition-all hover:-translate-y-0.5"
                >
                  Get Free Valuation
                </button>
              </motion.div>

              {/* AI Search Bar */}
              <motion.div variants={fadeUp} className="pt-2">
                <div className="rounded-2xl bg-white/95 dark:bg-slate-900/90 p-2.5 shadow-2xl backdrop-blur-md border border-white/30 dark:border-slate-800">
                  <AISearchBar />
                </div>
              </motion.div>

              {/* Value Highlights Pill Grid */}
              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-vs-gold/20 text-vs-gold shrink-0">
                    <BadgeCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Verified Listings</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Every property inspected by our team.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-vs-gold/20 text-vs-gold shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Zero Brokerage</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Buyers pay ₹0 commission fees.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-vs-gold/20 text-vs-gold shrink-0">
                    <HeadphonesIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Direct Support</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Dedicated assistance end-to-end.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Visual Card Showcase */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative mx-auto max-w-md">
                {/* Main Hero Featured Property Preview Card */}
                <div className="overflow-hidden rounded-3xl border border-white/20 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-xl transition-transform hover:scale-[1.01]">
                  <div className="relative h-72 w-full overflow-hidden rounded-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80"
                      alt="Featured Luxury Property"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-vs-gold border border-vs-gold/40 backdrop-blur-md">
                      Featured Direct Listing
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-950/85 p-3 backdrop-blur-md border border-white/10 text-white flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-400">Average Savings</p>
                        <p className="text-sm font-semibold text-vs-gold">₹1.5 Lakh - ₹5 Lakhs Brokerage</p>
                      </div>
                      <span className="rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 font-medium">
                        0% Commission
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-medium tracking-wider text-vs-gold">Verified Property</span>
                      <span className="text-xs text-slate-400">Direct Deal</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white line-clamp-1">Luxury 3 & 4 BHK Modern Apartments</h3>
                    <p className="text-xs text-slate-300">Prime Locations across Bangalore, Hyderabad, Pune & Delhi NCR</p>
                    <div className="pt-2 flex items-center justify-between border-t border-white/10">
                      <div>
                        <span className="text-xs text-slate-400">Starting from</span>
                        <p className="text-base font-bold text-white">₹65 Lakhs onwards</p>
                      </div>
                      <Link
                        to="/properties"
                        className="rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2 transition"
                      >
                        Explore Now →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Floating Creative Accent Cards */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-6 -left-8 rounded-2xl border border-white/20 bg-white/95 dark:bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md text-slate-900 dark:text-white max-w-[210px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      100%
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-snug">Verified Ownership</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No fake listings</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -top-6 -right-6 rounded-2xl border border-white/20 bg-white/95 dark:bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md text-slate-900 dark:text-white max-w-[200px]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-vs-gold/20 text-vs-gold">
                      <Landmark size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-snug">Easy Home Loan</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Partner Bank Rates</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TOP RATED (AUTO-SCROLL CAROUSEL) ===== */}
      <TopRatedCarousel items={featured} />

      <ValuationModal open={valuationOpen} onClose={() => setValuationOpen(false)} />

      {/* ===== NEWLY LAUNCHED PROJECTS ===== */}
      <NewlyLaunched />

      {/* ===== ACTIVE PROJECTS ===== */}
      <ActiveProjects />

      {/* ===== LISTINGS PREVIEW ===== */}
      {featured.length > 0 && (
        <section className="py-24 md:py-28 bg-vs-surface">
          <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-12"
            >
              <motion.div variants={fadeUp}>
                <div className="eyebrow text-vs-primary mb-3">Listings</div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-vs-text-primary tracking-tight">
                  Find homes that perfectly match your lifestyle
                </h2>
                <p className="mt-4 max-w-xl text-vs-text-secondary leading-relaxed">
                  Browse the newest curated properties and discover the right place for your next chapter.
                </p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link
                  to="/properties"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  View all listings <ArrowRight size={14} />
                </Link>
              </motion.div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
            >
              {featured.slice(0, 6).map((p) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <PropertyCard property={p} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== BUYER / SELLER CARDS ===== */}
      <section className="py-24 md:py-28 bg-vs-surface border-y border-vs-border" data-testid="role-cta-section">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <div className="eyebrow text-vs-gold mb-4">Get Started</div>
            <h2 className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
              Buying or selling? Either way — zero brokerage for buyers.
            </h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-6"
          >
            <motion.div variants={fadeUp}>
              <RoleCard
                role="buyer"
                title="Are you a Buyer?"
                copy="Browse verified properties, contact sellers directly through our team. No brokerage, ever."
                points={["Verified listings only", "Direct team contact", "AI-powered smart search"]}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <RoleCard
                role="seller"
                title="Are you a Seller?"
                copy="List your property for free. Our team verifies and publishes it within 48 hours."
                points={["Free listing", "AI-assisted form filling", "Internal verification before going live"]}
                variant="gold"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== HOME LOAN & FINANCING SECTION ===== */}
      <section className="py-16 bg-vs-bg border-b border-vs-border" data-testid="loan-financing-section">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <div className="card p-8 md:p-12 border-vs-gold/30 bg-gradient-to-br from-vs-gold/10 via-vs-surface to-vs-bg relative overflow-hidden">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-vs-gold/20 text-vs-gold text-xs font-semibold uppercase tracking-wider">
                  <Landmark size={14} /> Property Financing
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-vs-text-primary">
                  Need a Home Loan for Your Dream Property?
                </h2>
                <p className="text-vs-text-secondary leading-relaxed max-w-2xl">
                  Tell us a little about your requirement and our in-house financial team will help you explore competitive loan options with leading partner banks across India.
                </p>
                <div className="flex flex-wrap gap-6 pt-2 text-xs font-medium text-vs-text-secondary">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-vs-gold" /> Zero Processing Markup</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-vs-gold" /> Top Partner Banks</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-vs-gold" /> Fast Digital Guidance</span>
                </div>
              </div>
              <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
                <Link to="/loan-assistance" className="btn-primary text-base px-8 py-4 shadow-lg flex items-center gap-2">
                  Check Loan Assistance <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MOTIVE ===== */}
      <section id="motive" className="py-28 md:py-36 bg-vs-bg text-vs-text-primary relative overflow-hidden" data-testid="motive-section">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, var(--vs-primary) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-vs-gold/5 rounded-full blur-3xl" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="relative max-w-5xl mx-auto px-6 lg:px-12 text-center"
        >
          <motion.div variants={fadeUp} className="eyebrow text-vs-gold mb-6">Our Motive</motion.div>
          <motion.h2 variants={fadeUp} className="font-display font-medium text-vs-text-primary text-3xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
            "Buy property,
            <br />
            <span className="text-vs-gold">pay no brokerage."</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-8 text-vs-text-secondary text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            We believe buying a home should be simple, transparent, and fair. No middlemen. No hidden fees. Just you, the seller, and us.
          </motion.p>
          <motion.div variants={stagger} className="mt-16 grid sm:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
            <motion.div variants={fadeUp}>
              <Pillar Icon={Ban} title="Zero Brokerage">Buyers pay nothing. We charge no commission on transactions.</Pillar>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Pillar Icon={ShieldCheck} title="Verified Listings Only">Every property is internally reviewed and approved before going live.</Pillar>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Pillar Icon={HeadphonesIcon} title="Direct Team Contact">Reach a human at VisitSarva — not a call centre, not a broker.</Pillar>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== 8-SECTOR SHOWCASE GRID ===== */}
      <SectorShowcase />

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 md:py-28 bg-vs-surface border-y border-vs-border" data-testid="how-it-works">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-2xl mx-auto text-center mb-12"
          >
            <motion.div variants={fadeUp} className="eyebrow text-vs-gold mb-4">How It Works</motion.div>
            <motion.h2 variants={fadeUp} className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
              Four steps from sign-up to keys.
            </motion.h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="flex justify-center gap-3 mb-14"
          >
            <button
              data-testid="how-tab-buyer"
              onClick={() => setHowTab("buyer")}
              className={`chip ${howTab === "buyer" ? "chip-active" : ""}`}
            >
              For Buyers
            </button>
            <button
              data-testid="how-tab-seller"
              onClick={() => setHowTab("seller")}
              className={`chip ${howTab === "seller" ? "chip-active" : ""}`}
            >
              For Sellers
            </button>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {(howTab === "buyer"
              ? [
                  ["Sign Up", "Create a free buyer account in 30 seconds."],
                  ["Search & Browse", "Use AI smart search or filters to find your match."],
                  ["Save & Enquire", "Shortlist favourites and send an enquiry."],
                  ["Our Team Connects You", "We coordinate directly between you and the seller."],
                ]
              : [
                  ["Sign Up", "Create a free seller account."],
                  ["List Your Property", "Our AI assistant fills the form from your description."],
                  ["Team Verifies", "We audit the listing within 48 hours."],
                  ["Property Goes Live", "Verified listings appear to buyers across India."],
                ]
            ).map(([title, body], i) => (
              <motion.div key={title} variants={fadeUp} className="relative">
                <div className="w-12 h-12 rounded-full bg-vs-gold text-vs-bg flex items-center justify-center font-display font-semibold text-lg">
                  {i + 1}
                </div>
                <h3 className="mt-5 font-display font-medium text-vs-text-primary text-lg">{title}</h3>
                <p className="mt-2 text-sm text-vs-text-muted leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== ALL-IN-ONE DOCUMENTS ===== */}
      <section id="services" className="py-24 md:py-28 bg-vs-bg" data-testid="services-section">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-2xl mb-14"
          >
            <motion.div variants={fadeUp} className="eyebrow text-vs-gold mb-4">Property Services</motion.div>
            <motion.h2 variants={fadeUp} className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
              All-in-One Documents.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-vs-text-secondary">
              Khata, valuation, conversions, approvals — handled end-to-end by our specialist team.
            </motion.p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="flex flex-col lg:flex-row items-center gap-10 mb-14 p-8 card"
          >
            <DocumentsDonutChart
              items={DOCUMENT_SERVICES.map((s) => ({ value: s.v, label: s.l }))}
              selected={selectedService}
              onSelect={setSelectedService}
            />
            <div className="flex-1 text-center lg:text-left">
              <h3 className="font-display font-medium text-vs-text-primary text-2xl">
                {DOCUMENT_SERVICES.find((s) => s.v === selectedService)?.l}
              </h3>
              <p className="mt-3 text-vs-text-secondary leading-relaxed">
                {DOCUMENT_SERVICES.find((s) => s.v === selectedService)?.body}
              </p>
              <Link
                to="/services"
                className="mt-6 inline-flex items-center gap-2 text-sm text-vs-gold hover:text-vs-primary-hover transition-colors duration-300 group"
              >
                Request this service <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {DOCUMENT_SERVICES.map((s) => (
              <motion.div
                key={s.v}
                variants={fadeUp}
                className={`card p-6 flex flex-col cursor-pointer transition-all duration-300 ${
                  selectedService === s.v ? "border-vs-primary ring-2 ring-vs-primary/20" : "hover:border-vs-primary/30"
                }`}
                data-testid={`service-card-${s.v}`}
                onClick={() => setSelectedService(s.v)}
              >
                <div className="w-12 h-12 rounded-lg bg-vs-gold/10 text-vs-gold flex items-center justify-center">
                  <s.Icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display font-medium text-vs-text-primary text-lg">{s.l}</h3>
                <p className="mt-2 text-sm text-vs-text-muted flex-1 leading-relaxed">{s.body}</p>
                <Link to="/services" className="mt-6 text-sm text-vs-gold hover:text-vs-primary-hover flex items-center gap-2 transition-colors duration-300 group">
                  Request Service <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-20 bg-vs-surface border-y border-vs-border" data-testid="stats-section">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              [1240, "Properties Listed"],
              [18, "Cities Covered"],
              [320, "Verified Sellers"],
              [980, "Happy Buyers"],
            ].map(([n, label]) => (
              <motion.div key={label} variants={fadeUp} className="text-center md:text-left">
                <div className="font-display text-4xl md:text-5xl font-medium text-vs-gold">
                  {n.toLocaleString("en-IN")}+
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-vs-text-muted">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-24 md:py-28 bg-vs-bg">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-2xl mb-14"
          >
            <motion.div variants={fadeUp} className="eyebrow text-vs-gold mb-4">Customer Stories</motion.div>
            <motion.h2 variants={fadeUp} className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight">
              From the people who trusted us.
            </motion.h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { name: "Arjun Mehra", role: "Buyer, Bangalore", text: "Found my 3 BHK in Whitefield in two weeks — and paid zero brokerage. The team handled everything." },
              { name: "Kavya Iyer", role: "Seller, Hyderabad", text: "The AI listing form did half my work. Property was live in 3 days, sold in 6 weeks." },
              { name: "Rohit Bhandari", role: "Buyer, Pune", text: "What I loved most: a real person from VisitSarva calling me back, not a broker chasing commission." },
            ].map((t) => (
              <motion.div key={t.name} variants={fadeUp} className="card p-6">
                <div className="flex gap-1 text-vs-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-5 text-vs-text-primary leading-relaxed">"{t.text}"</p>
                <div className="mt-6 pt-5 border-t border-vs-border">
                  <div className="font-display font-medium text-vs-text-primary">{t.name}</div>
                  <div className="text-xs text-vs-text-muted mt-1">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const RoleCard = ({ role, title, copy, points, variant = "default" }) => {
  const isGold = variant === "gold";
  return (
    <div
      data-testid={`role-card-${role}`}
      className={`relative p-8 md:p-10 rounded-xl border transition-all duration-300 ${
        isGold
          ? "bg-vs-gold/10 border-vs-gold/30 hover:border-vs-gold"
          : "bg-vs-bg border-vs-border hover:border-vs-gold/50"
      }`}
    >
      <h3 className={`font-display text-2xl md:text-3xl font-medium ${isGold ? "text-vs-gold" : "text-vs-text-primary"}`}>
        {title}
      </h3>
      <p className={`mt-3 text-sm md:text-base leading-relaxed ${isGold ? "text-vs-text-secondary" : "text-vs-text-muted"}`}>
        {copy}
      </p>
      <ul className="mt-6 space-y-3 text-sm">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-3 text-vs-text-secondary">
            <CheckCircle2 size={16} className="text-vs-gold shrink-0" />
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to={`/register?role=${role}`}
          data-testid={`role-${role}-signup`}
          className={isGold ? "btn-primary" : "btn-primary"}
        >
          Sign Up as {role === "buyer" ? "Buyer" : "Seller"}
        </Link>
        <Link
          to="/login"
          data-testid={`role-${role}-login`}
          className="btn-secondary"
        >
          Login
        </Link>
      </div>
    </div>
  );
};

const Pillar = ({ Icon, title, children }) => (
  <div className="p-6 rounded-lg bg-vs-surface/50 border border-vs-border">
    <Icon size={28} className="text-vs-gold" strokeWidth={1.5} />
    <h4 className="mt-5 font-display text-xl font-medium text-vs-text-primary">{title}</h4>
    <p className="mt-2 text-sm text-vs-text-muted leading-relaxed">{children}</p>
  </div>
);

/* ── Auto-scrolling Top Rated Carousel ───────────────────────────────────── */
const TopRatedCarousel = ({ items }) => {
  const [paused, setPaused] = useState(false);
  const cards = (items || []).slice(0, 10);
  if (!cards.length) return null;
  const doubled = [...cards, ...cards];
  const speed = Math.max(cards.length * 4, 20); // seconds

  return (
    <section className="py-8 bg-transparent overflow-hidden">
      <style>{`
        @keyframes vs-carousel-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
      <div className="max-w-[80rem] mx-auto px-6 lg:px-12 mb-4">
        <div className="eyebrow text-vs-primary mb-2">Top Rated</div>
        <h3 className="font-display text-2xl md:text-3xl font-semibold text-vs-text-primary">Top rated listings</h3>
      </div>

      <div
        className="cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          style={{
            display: "flex",
            gap: "24px",
            width: "max-content",
            padding: "16px 24px",
            animation: `vs-carousel-scroll ${speed}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
            willChange: "transform",
          }}
        >
          {doubled.map((p, i) => (
            <div key={`${p.id}-${i}`} style={{ minWidth: "320px", flexShrink: 0 }}>
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Landing;
