import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Sofa, BedDouble, ChefHat, Home, Building2, Sparkles, Phone, MessageCircle,
  CheckCircle2, ChevronDown, ChevronRight, Loader2, Upload, X, ShieldCheck,
  User, MapPin, IndianRupee, Star, ArrowRight, Check, Info
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

/* ─── CONSTANTS ─────────────────────────────────────────────────────────────── */

const SERVICE_CATEGORIES = [
  {
    id: "living-room",
    label: "Living Room Interiors",
    Icon: Sofa,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80",
    description: "Transform your living space into a warm, welcoming haven with thoughtful layouts, premium furnishings, and curated décor.",
  },
  {
    id: "bedroom",
    label: "Bedroom Interiors",
    Icon: BedDouble,
    image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&auto=format&fit=crop&q=80",
    description: "Create your personal retreat — serene, functional bedroom designs tailored to your lifestyle and preferences.",
  },
  {
    id: "kitchen",
    label: "Modular Kitchen",
    Icon: ChefHat,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop&q=80",
    description: "Smart, efficient modular kitchens with ergonomic storage, premium finishes, and designs suited to Indian cooking habits.",
  },
  {
    id: "full-home",
    label: "Full Home Interiors",
    Icon: Home,
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&auto=format&fit=crop&q=80",
    description: "End-to-end interior design for your entire home — unified design language, coordinated finishes, and seamless execution.",
  },
  {
    id: "office",
    label: "Office & Commercial Interiors",
    Icon: Building2,
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80",
    description: "Professional workspaces and commercial interiors designed for productivity, brand identity, and client experience.",
  },
];

const PROPERTY_TYPES = ["Apartment", "Independent House", "Villa", "Office", "Commercial Space", "Other"];
const RESIDENTIAL_TYPES = ["Apartment", "Independent House", "Villa"];

const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK", "Custom / Other"];

const BUDGET_RANGES = [
  "Below ₹3 lakh",
  "₹3–5 lakh",
  "₹5–10 lakh",
  "₹10–20 lakh",
  "₹20–30 lakh",
  "Above ₹30 lakh",
  "Not decided yet",
];

const WHY_CHOOSE = [
  { Icon: User, title: "Customer-Focused Approach", desc: "Every design decision is guided by your preferences, needs, and the way you live." },
  { Icon: IndianRupee, title: "Budget-Matched Solutions", desc: "We work within your approved budget to deliver meaningful, quality-driven design." },
  { Icon: Sparkles, title: "Personalised Consultation", desc: "Dedicated one-on-one sessions to understand your vision before recommending solutions." },
  { Icon: Sofa, title: "Multiple Service Categories", desc: "From single rooms to full-home transformations — residential and commercial both covered." },
  { Icon: MessageCircle, title: "Clear Communication", desc: "Transparent updates throughout the process, with no hidden costs or surprises." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Submit Your Enquiry", desc: "Fill in the consultation form with basic details about your property and requirements." },
  { step: "02", title: "Connect with Our Team", desc: "Our interior design team will reach out to schedule a convenient consultation call." },
  { step: "03", title: "Discuss Your Requirements", desc: "Share your vision, inspiration, and preferences. Detailed measurements and materials are discussed at this stage." },
  { step: "04", title: "Receive a Customised Proposal", desc: "We prepare a tailored design concept and proposal based on your specific needs and budget." },
];

const FAQS = [
  { q: "What interior design services does VisitSarva offer?", a: "VisitSarva offers interior design consultation and planning services across five categories: Living Room Interiors, Bedroom Interiors, Modular Kitchen, Full Home Interiors, and Office & Commercial Interiors." },
  { q: "Can I select multiple interior design services?", a: "Yes! You can select multiple service categories in the enquiry form. Our team will discuss each requirement during the consultation." },
  { q: "Is the initial consultation free?", a: "Yes, the initial consultation is free. Our team will connect with you to understand your requirements before any commitment." },
  { q: "Do I need to upload a floor plan?", a: "Uploading a floor plan is optional. If you have one available, it helps our team give a more informed initial response, but it is not mandatory to submit the enquiry." },
  { q: "Can I enquire if I have not finalised my budget?", a: "Absolutely. You can select 'Not decided yet' in the budget field. Our team will help you understand what is possible at different budget levels during the consultation." },
  { q: "Will I receive a quotation immediately after submitting the form?", a: "No. The online form is the first step to connect with our team. Actual pricing, material specifications, and execution details are discussed during the consultation after understanding your specific requirements." },
  { q: "Can VisitSarva help with both residential and commercial interiors?", a: "Yes, we work with residential properties (apartments, independent houses, villas) and commercial/office spaces." },
  { q: "How will the team contact me after submission?", a: "Our team will contact you on the mobile number you provide in the form. Please ensure the number is reachable and OTP-verified to complete the submission." },
];

const WHATSAPP_NUMBER = "919108070000"; // WhatsApp number without +
const CALL_NUMBER = "+91 91080 70000"; // Display format

/* ─── ANIMATION VARIANTS ─────────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = (delay = 0.08) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

/* ─── OTP CONTROLS — note: Dev fallback mode ─────────────────────────────────── */
// Production OTP requires a configured SMS provider (e.g. Twilio, MSG91).
// Until the provider is configured, a DEVELOPMENT MODE is used that accepts
// any 6-digit code entered. The backend endpoint for production OTP is 
// /api/otp/send and /api/otp/verify and must be connected to an SMS provider.

function OtpSection({ mobile, onVerified }) {
  const [step, setStep] = useState("idle"); // idle | sending | sent | verifying | verified
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  const startCountdown = useCallback((secs = 60) => {
    setCountdown(secs);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendOtp = async () => {
    const digits = mobile.replace(/\D/g, "").replace(/^91/, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number first.");
      return;
    }
    setError("");
    setStep("sending");
    try {
      await api.post("/api/otp/send", { mobile: digits });
      setStep("sent");
      startCountdown(60);
      toast.success("OTP sent to your mobile number.");
    } catch (err) {
      // DEVELOPMENT FALLBACK: If OTP provider is not configured, enter dev mode
      const detail = err?.response?.data?.detail || "";
      if (err?.response?.status === 503 || detail.includes("not configured") || detail.includes("provider")) {
        setStep("sent");
        startCountdown(60);
        toast("⚠️ OTP provider not configured — using development mode. Enter any 6 digits.", { icon: "🔧", duration: 6000 });
      } else {
        setStep("idle");
        setError("Failed to send OTP. Please try again.");
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setError("");
    setStep("verifying");
    const digits = mobile.replace(/\D/g, "").replace(/^91/, "");
    try {
      await api.post("/api/otp/verify", { mobile: digits, otp });
      setStep("verified");
      onVerified(true, "verified_via_provider");
      toast.success("Mobile number verified successfully!");
    } catch (err) {
      const detail = err?.response?.data?.detail || "";
      // Dev mode: accept any 6 digit code if endpoint returns 503/not configured
      if (err?.response?.status === 503 || detail.includes("not configured") || detail.includes("provider")) {
        setStep("verified");
        onVerified(true, "dev_mode_bypass");
        toast("✅ Dev mode: OTP accepted. Configure SMS provider for production.", { icon: "🔧" });
      } else {
        setStep("sent");
        setError("Invalid OTP. Please check and try again.");
      }
    }
  };

  if (step === "verified") {
    return (
      <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" /> Mobile number verified
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {step === "idle" && (
        <button
          type="button"
          onClick={handleSendOtp}
          className="px-4 py-2 rounded-lg bg-vs-primary text-white text-sm font-medium hover:bg-vs-primary-hover transition-colors"
        >
          Send OTP
        </button>
      )}

      {step === "sending" && (
        <div className="flex items-center gap-2 text-sm text-vs-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…
        </div>
      )}

      {step === "sent" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Enter 6-digit OTP"
              className="input-field w-40 text-center tracking-widest font-mono"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Verify
            </button>
          </div>
          <button
            type="button"
            disabled={countdown > 0}
            onClick={handleSendOtp}
            className="text-xs text-vs-text-secondary hover:text-vs-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
          </button>
        </div>
      )}

      {step === "verifying" && (
        <div className="flex items-center gap-2 text-sm text-vs-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ─── FAQ ITEM ───────────────────────────────────────────────────────────────── */

function FaqItem({ faq, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-vs-border rounded-xl overflow-hidden bg-vs-surface transition-all duration-200">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center justify-between px-5 py-4 gap-3"
        aria-expanded={open}
        id={`faq-btn-${index}`}
      >
        <span className="text-sm font-medium text-vs-text-primary leading-snug">{faq.q}</span>
        <ChevronDown
          className={`w-4 h-4 text-vs-gold flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm text-vs-text-secondary leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── FILE UPLOAD ────────────────────────────────────────────────────────────── */

function FileUploadField({ label, accept, value, onChange, onRemove, helpText }) {
  const ref = useRef(null);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-vs-text-secondary">{label}</label>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-vs-border bg-vs-surface text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-vs-text-primary truncate flex-1">{value.name}</span>
          <button type="button" onClick={onRemove} className="text-vs-text-muted hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-lg border border-dashed border-vs-border hover:border-vs-primary bg-vs-bg hover:bg-vs-primary-muted text-sm text-vs-text-secondary hover:text-vs-primary transition-all duration-200"
        >
          <Upload className="w-4 h-4 flex-shrink-0" />
          <span>Click to upload</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
      />
      {helpText && <p className="text-[11px] text-vs-text-muted">{helpText}</p>}
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────────── */

export default function InteriorDesigning() {
  const formRef = useRef(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [form, setForm] = useState({
    customer_name: "",
    mobile: "",
    mobile_verified: false,
    otp_verification_ref: "",
    contact_consent: false,
    services_required: [],
    property_type: "",
    property_size: "",
    budget_range: "",
    city: "",
    area_locality: "",
    additional_address: "",
  });
  const [floorPlanFile, setFloorPlanFile] = useState(null);
  const [refImages, setRefImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  /* ── Helpers ── */
  const setField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const isResidential = RESIDENTIAL_TYPES.includes(form.property_type);

  const toggleService = (label) => {
    setSelectedServices(prev => {
      const next = prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label];
      setForm(f => ({ ...f, services_required: next }));
      return next;
    });
  };

  const scrollToForm = (serviceLabel) => {
    if (serviceLabel && !selectedServices.includes(serviceLabel)) {
      toggleService(serviceLabel);
    }
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    if (!form.customer_name.trim() || form.customer_name.trim().length < 2) errs.customer_name = "Please enter your full name.";
    const digits = form.mobile.replace(/\D/g, "").replace(/^91/, "");
    if (digits.length !== 10) errs.mobile = "Please enter a valid 10-digit Indian mobile number.";
    if (!form.mobile_verified) errs.otp = "Please verify your mobile number with OTP before submitting.";
    if (form.services_required.length === 0) errs.services = "Please select at least one service category.";
    if (!form.property_type) errs.property_type = "Please select a property type.";
    if (!form.property_size) errs.property_size = "Please enter your property size / BHK.";
    if (!form.budget_range) errs.budget_range = "Please select an approximate budget range.";
    if (!form.city.trim()) errs.city = "Please enter your city.";
    if (!form.area_locality.trim()) errs.area_locality = "Please enter your area / locality.";
    if (!form.contact_consent) errs.consent = "Please provide consent to be contacted.";
    return errs;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstErrKey = Object.keys(errs)[0];
      document.getElementById(`field-${firstErrKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // NOTE: File uploads are stored locally here for now (no remote storage configured)
      // In production, upload files to cloud storage and pass the URL to the API.
      const payload = {
        ...form,
        floor_plan_url: floorPlanFile ? `[local-file:${floorPlanFile.name}]` : "",
        floor_plan_filename: floorPlanFile?.name || "",
        reference_images: refImages.map(f => `[local-file:${f.name}]`),
      };

      const { data } = await api.post("/interior-enquiries", payload);
      setSubmitResult(data);
      toast.success("Enquiry submitted successfully!");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || "Submission failed. Please try again.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success Screen ── */
  if (submitResult) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text-primary flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <p className="text-xs font-mono font-bold tracking-widest text-vs-gold uppercase mb-2">
                Reference ID: {submitResult.interior_enquiry_id}
              </p>
              <h1 className="font-display text-3xl font-semibold text-vs-text-primary">
                Thank you for choosing Visit Sarva.
              </h1>
              <p className="text-vs-text-secondary mt-3 leading-relaxed">
                Your interior design enquiry has been received. Our team will contact you shortly.
              </p>
            </div>
            <div className="bg-vs-surface border border-vs-border rounded-xl p-4 text-left text-xs space-y-2 text-vs-text-secondary">
              <div className="flex justify-between"><span>Name:</span><strong className="text-vs-text-primary">{form.customer_name}</strong></div>
              <div className="flex justify-between"><span>Mobile:</span><strong className="text-vs-text-primary">{form.mobile}</strong></div>
              <div className="flex justify-between"><span>Services:</span><strong className="text-vs-text-primary text-right max-w-[60%]">{form.services_required.join(", ")}</strong></div>
              <div className="flex justify-between"><span>City:</span><strong className="text-vs-text-primary">{form.city}</strong></div>
            </div>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              Back to Home <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── Main Render ── */
  return (
    <div className="min-h-screen bg-vs-bg text-vs-text-primary flex flex-col">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 overflow-hidden">
        <div
          className="relative min-h-[88vh] flex items-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.97) 45%, rgba(255,255,255,0.6) 70%, rgba(255,255,255,0.2) 100%), url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1400&auto=format&fit=crop&q=85')`,
            backgroundSize: "cover",
            backgroundPosition: "center right",
          }}
        >
          <div className="max-w-[80rem] mx-auto px-6 lg:px-12 w-full py-20">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger()}
              className="max-w-2xl space-y-6"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-vs-gold/10 border border-vs-gold/30 text-vs-gold text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={13} /> Special Services · Interior Designing
              </motion.div>
              <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-vs-text-primary leading-tight">
                Transform Your Space with{" "}
                <span className="text-vs-gold">Thoughtful Interior Design</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg text-vs-text-secondary leading-relaxed max-w-xl">
                VisitSarva connects you with interior design services that understand your property, your budget, and your lifestyle — from single rooms to complete home transformations.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => scrollToForm(null)}
                  className="btn-primary inline-flex items-center gap-2 shadow-lg"
                >
                  Get Free Consultation
                </button>
                <a
                  href="#services-section"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  Explore Our Services <ChevronRight className="w-4 h-4" />
                </a>
              </motion.div>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2 text-xs text-vs-text-secondary">
                {["Free Initial Consultation", "Residential & Commercial", "Multiple Service Categories"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-vs-gold" /> {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SERVICE DESCRIPTION ───────────────────────────────────────────── */}
      <section className="py-16 bg-vs-surface border-y border-vs-border">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 text-center max-w-3xl mx-auto">
          <p className="eyebrow text-vs-gold mb-3">Interior Design Solutions</p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-vs-text-primary mb-5">
            Interior Design Solutions for Every Space
          </h2>
          <p className="text-vs-text-secondary leading-relaxed text-base max-w-2xl mx-auto">
            Whether you are moving into a new apartment, renovating your home, or setting up a professional workspace — VisitSarva's interior design services are designed to work with your space and within your plans. We help you go from a bare property to a thoughtfully designed, liveable space through dedicated consultation and service coordination.
          </p>
        </div>
      </section>

      {/* ── SERVICE CARDS ─────────────────────────────────────────────────── */}
      <section id="services-section" className="py-20 max-w-[80rem] mx-auto px-6 lg:px-12 w-full scroll-mt-20">
        <div className="text-center mb-12">
          <p className="eyebrow text-vs-gold mb-3">What We Cover</p>
          <h2 className="font-display text-3xl font-semibold text-vs-text-primary">Our Interior Design Categories</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {SERVICE_CATEGORIES.map(({ id, label, Icon, image, description }) => {
            const isSelected = selectedServices.includes(label);
            return (
              <motion.article
                key={id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "border-vs-gold shadow-lg"
                    : "border-vs-border hover:border-vs-primary hover:shadow-md"
                }`}
                onClick={() => toggleService(label)}
                data-testid={`service-card-${id}`}
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={image}
                    alt={label}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-vs-gold flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm leading-tight mb-1">{label}</h3>
                    <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">{description}</p>
                  </div>
                </div>
                <div className="p-3 bg-vs-surface flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); scrollToForm(label); }}
                    className="flex-1 py-1.5 text-xs font-medium text-vs-primary hover:bg-vs-primary-muted rounded-lg transition-colors"
                  >
                    Enquire →
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
        {selectedServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => scrollToForm(null)}
              className="btn-primary inline-flex items-center gap-2 shadow-md"
            >
              Continue to Enquiry Form ({selectedServices.length} selected)
            </button>
          </motion.div>
        )}
      </section>

      {/* ── ENQUIRY FORM ─────────────────────────────────────────────────── */}
      <section
        id="enquiry-form"
        ref={formRef}
        className="py-20 bg-vs-surface border-y border-vs-border scroll-mt-20"
      >
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 w-full">
          <div className="max-w-3xl mx-auto">
            {/* Section heading */}
            <div className="text-center mb-10">
              <p className="eyebrow text-vs-gold mb-3">Free Consultation</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-vs-text-primary mb-3">
                Book Your Free Interior Design Consultation
              </h2>
              <p className="text-vs-text-secondary max-w-xl mx-auto leading-relaxed">
                Tell us a little about your space. Our team will connect with you to understand your requirements.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-8 shadow-premium-lg" noValidate>

              {/* ── A. Services Required ── */}
              <div id="field-services" className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                  <Sofa size={13} /> A. Service Required <span className="text-red-500">*</span>
                </div>
                <p className="text-xs text-vs-text-secondary">Select one or more services. You can also click the cards above to pre-select.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[...SERVICE_CATEGORIES.map(s => s.label), "Other"].map(label => {
                    const active = form.services_required.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleService(label)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                          active
                            ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                            : "border-vs-border bg-vs-bg text-vs-text-secondary hover:border-vs-primary hover:text-vs-primary"
                        }`}
                      >
                        {active && <span className="mr-1">✓</span>}
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.services && <p className="text-xs text-red-500">{errors.services}</p>}
              </div>

              {/* ── B. Property Type ── */}
              <div id="field-property_type" className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                  <Home size={13} /> B. Property Type <span className="text-red-500">*</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROPERTY_TYPES.map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => { setField("property_type", pt); setField("property_size", ""); }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        form.property_type === pt
                          ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                          : "border-vs-border bg-vs-bg text-vs-text-secondary hover:border-vs-primary hover:text-vs-primary"
                      }`}
                    >
                      {form.property_type === pt && <span className="mr-1">✓</span>}
                      {pt}
                    </button>
                  ))}
                </div>
                {errors.property_type && <p className="text-xs text-red-500">{errors.property_type}</p>}
              </div>

              {/* ── C. Property Size / BHK — conditional ── */}
              {form.property_type && (
                <div id="field-property_size" className="space-y-3">
                  <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                    <Building2 size={13} /> C. Property Size / BHK <span className="text-red-500">*</span>
                  </div>
                  {isResidential ? (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {BHK_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setField("property_size", opt)}
                          className={`px-2 py-2 rounded-xl border text-xs font-medium transition-all ${
                            form.property_size === opt
                              ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                              : "border-vs-border bg-vs-bg text-vs-text-secondary hover:border-vs-primary hover:text-vs-primary"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={form.property_size}
                        onChange={e => setField("property_size", e.target.value)}
                        placeholder="e.g. 2000 sq ft, 3 Floors, etc. (optional)"
                        className="input-field max-w-sm"
                      />
                      <p className="text-[11px] text-vs-text-muted mt-1">Approximate size is helpful but not mandatory.</p>
                    </div>
                  )}
                  {errors.property_size && <p className="text-xs text-red-500">{errors.property_size}</p>}
                </div>
              )}

              {/* ── D. Budget ── */}
              <div id="field-budget_range" className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                  <IndianRupee size={13} /> D. Approximate Budget <span className="text-red-500">*</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUDGET_RANGES.map(br => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => setField("budget_range", br)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        form.budget_range === br
                          ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                          : "border-vs-border bg-vs-bg text-vs-text-secondary hover:border-vs-primary hover:text-vs-primary"
                      }`}
                    >
                      {form.budget_range === br && <span className="mr-1">✓</span>}
                      {br}
                    </button>
                  ))}
                </div>
                {errors.budget_range && <p className="text-xs text-red-500">{errors.budget_range}</p>}
              </div>

              {/* ── E. Location ── */}
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                  <MapPin size={13} /> E. Property Location
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div id="field-city">
                    <label className="label">City <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => setField("city", e.target.value)}
                      placeholder="e.g. Bengaluru, Hyderabad"
                      className="input-field"
                    />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <div id="field-area_locality">
                    <label className="label">Area / Locality <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.area_locality}
                      onChange={e => setField("area_locality", e.target.value)}
                      placeholder="e.g. Whitefield, Banjara Hills"
                      className="input-field"
                    />
                    {errors.area_locality && <p className="text-xs text-red-500 mt-1">{errors.area_locality}</p>}
                  </div>
                </div>
                <div>
                  <label className="label">Additional Address Details (Optional)</label>
                  <input
                    type="text"
                    value={form.additional_address}
                    onChange={e => setField("additional_address", e.target.value)}
                    placeholder="Flat number, project name, landmark…"
                    className="input-field"
                  />
                </div>
              </div>

              {/* ── F. Customer Name ── */}
              <div id="field-customer_name" className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                  <User size={13} /> F. Your Name <span className="text-red-500">*</span>
                </div>
                <input
                  type="text"
                  value={form.customer_name}
                  onChange={e => setField("customer_name", e.target.value)}
                  placeholder="Your full name"
                  className="input-field max-w-sm"
                />
                {errors.customer_name && <p className="text-xs text-red-500">{errors.customer_name}</p>}
              </div>

              {/* ── G. Mobile + OTP ── */}
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                  <Phone size={13} /> G. Mobile Number <span className="text-red-500">*</span>
                </div>
                <div id="field-mobile" className="flex flex-wrap items-start gap-3">
                  <div className="flex items-center border border-vs-border rounded-xl overflow-hidden bg-vs-surface flex-1 min-w-[200px] max-w-xs focus-within:border-vs-primary focus-within:ring-2 focus-within:ring-vs-primary/20 transition-all">
                    <span className="px-3 py-3.5 text-sm text-vs-text-secondary border-r border-vs-border bg-vs-bg select-none">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.mobile}
                      disabled={form.mobile_verified}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "");
                        setField("mobile", v);
                        setField("mobile_verified", false);
                        setField("otp_verification_ref", "");
                      }}
                      placeholder="10-digit mobile number"
                      className="flex-1 px-3 py-3.5 text-sm bg-transparent outline-none text-vs-text-primary placeholder-vs-text-muted"
                    />
                  </div>
                  {!form.mobile_verified && (
                    <OtpSection
                      mobile={form.mobile}
                      onVerified={(verified, ref) => {
                        setField("mobile_verified", verified);
                        setField("otp_verification_ref", ref);
                      }}
                    />
                  )}
                  {form.mobile_verified && (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium py-3">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </div>
                  )}
                </div>
                {errors.mobile && <p id="field-mobile" className="text-xs text-red-500">{errors.mobile}</p>}
                {errors.otp && <p id="field-otp" className="text-xs text-red-500 flex items-center gap-1"><Info className="w-3 h-3" /> {errors.otp}</p>}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 text-xs">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>OTP verification is required. The form cannot be submitted without verifying your mobile number.</span>
                </div>
              </div>

              {/* ── H. Consent ── */}
              <div id="field-consent" className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      form.contact_consent ? "bg-vs-primary border-vs-primary" : "border-vs-border group-hover:border-vs-primary"
                    }`}
                    onClick={() => setField("contact_consent", !form.contact_consent)}
                  >
                    {form.contact_consent && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-vs-text-secondary leading-relaxed">
                    I agree to be contacted by VisitSarva regarding my interior design enquiry. <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.consent && <p className="text-xs text-red-500 ml-8">{errors.consent}</p>}
              </div>

              {/* ── Optional uploads ── */}
              <div className="space-y-4 pt-2 border-t border-vs-border">
                <div className="text-xs uppercase tracking-wider text-vs-text-muted font-semibold">
                  Optional: Upload Files
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <FileUploadField
                    label="Floor Plan (Optional)"
                    accept=".jpg,.jpeg,.png,.pdf"
                    value={floorPlanFile}
                    onChange={setFloorPlanFile}
                    onRemove={() => setFloorPlanFile(null)}
                    helpText="JPG, PNG, or PDF · Max 5 MB · Helps us give a better initial response"
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-vs-text-secondary">Reference Images (Optional)</label>
                    <button
                      type="button"
                      onClick={() => document.getElementById("ref-images-input")?.click()}
                      className="w-full flex items-center gap-2 px-3 py-3 rounded-lg border border-dashed border-vs-border hover:border-vs-primary bg-vs-bg hover:bg-vs-primary-muted text-sm text-vs-text-secondary hover:text-vs-primary transition-all duration-200"
                    >
                      <Upload className="w-4 h-4 flex-shrink-0" />
                      <span>Add inspiration photos {refImages.length > 0 && `(${refImages.length} added)`}</span>
                    </button>
                    <input
                      id="ref-images-input"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setRefImages(prev => [...prev, ...files].slice(0, 5));
                      }}
                    />
                    {refImages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {refImages.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-vs-surface border border-vs-border rounded-full text-[11px] text-vs-text-secondary">
                            {f.name.slice(0, 15)}{f.name.length > 15 ? "…" : ""}
                            <button type="button" onClick={() => setRefImages(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-vs-text-muted">JPG, PNG · Max 5 files</p>
                  </div>
                </div>
              </div>

              {/* ── Submit ── */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full justify-center text-base py-4 shadow-lg flex items-center gap-2"
                  id="btn-submit-enquiry"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting Enquiry…</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Book My Free Consultation</>
                  )}
                </button>
                <p className="text-[11px] text-vs-text-muted text-center mt-3">
                  🔒 Your information is kept confidential. No spam, no unsolicited calls from third parties.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE VISIT SARVA ───────────────────────────────────────── */}
      <section className="py-20 max-w-[80rem] mx-auto px-6 lg:px-12 w-full">
        <div className="text-center mb-12">
          <p className="eyebrow text-vs-gold mb-3">Why Choose Us</p>
          <h2 className="font-display text-3xl font-semibold text-vs-text-primary">Why Choose Visit Sarva</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {WHY_CHOOSE.map(({ Icon: IconC, title, desc }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="flex flex-col items-center text-center p-5 rounded-2xl border border-vs-border bg-vs-surface hover:border-vs-primary hover:shadow-md transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-vs-gold/10 text-vs-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <IconC className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm text-vs-text-primary mb-2">{title}</h3>
              <p className="text-xs text-vs-text-secondary leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-vs-surface border-y border-vs-border">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 w-full">
          <div className="text-center mb-12">
            <p className="eyebrow text-vs-gold mb-3">Our Process</p>
            <h2 className="font-display text-3xl font-semibold text-vs-text-primary">How It Works</h2>
            <p className="text-vs-text-secondary mt-3 max-w-xl mx-auto text-sm">
              Detailed measurements, materials, and execution requirements will be discussed during your consultation — not at the online form stage.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="p-5 rounded-2xl bg-vs-bg border border-vs-border h-full">
                  <span className="font-mono text-3xl font-bold text-vs-border">{step}</span>
                  <h3 className="font-semibold text-vs-text-primary mt-3 mb-2 text-sm">{title}</h3>
                  <p className="text-xs text-vs-text-secondary leading-relaxed">{desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 -translate-y-1/2 text-vs-text-muted text-xl text-center">→</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-20 max-w-[80rem] mx-auto px-6 lg:px-12 w-full">
        <div className="text-center mb-12">
          <p className="eyebrow text-vs-gold mb-3">Questions Answered</p>
          <h2 className="font-display text-3xl font-semibold text-vs-text-primary">Frequently Asked Questions</h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-3">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </section>

      {/* ── CONTACT CTA ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-vs-surface border-y border-vs-border">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 text-center space-y-6">
          <p className="eyebrow text-vs-gold mb-2">Get in Touch</p>
          <h2 className="font-display text-3xl font-semibold text-vs-text-primary">Prefer to Reach Out Directly?</h2>
          <p className="text-vs-text-secondary max-w-lg mx-auto text-sm">
            You can also contact us on WhatsApp or call us directly. The enquiry form works independently and does not require WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20VisitSarva%2C%20I%20am%20interested%20in%20Interior%20Design%20services.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1DB954] text-white"
              id="btn-whatsapp-contact"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
            <a
              href={`tel:${CALL_NUMBER.replace(/\s/g, "")}`}
              className="btn-secondary inline-flex items-center gap-2"
              id="btn-call-contact"
            >
              <Phone className="w-4 h-4" /> {CALL_NUMBER}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
