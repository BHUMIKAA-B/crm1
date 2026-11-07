import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileImage,
  Home,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Upload,
  Warehouse,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

const PACKERS_MOVERS_HERO_IMAGE = "/assets/visitsarva-packers-movers-banner.png";

const SERVICE_CARDS = [
  {
    title: "Home Relocation",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    description: "Move your home with planned packing, safe loading, and on-time delivery for every room.",
  },
  {
    title: "Office Relocation",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    description: "Relocate workstations, equipment, and office essentials with minimal downtime.",
  },
  {
    title: "Local Shifting",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80",
    description: "Quick and reliable moving support for same-city moves with flexible scheduling.",
  },
  {
    title: "Domestic Relocation",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
    description: "Intercity and long-distance moving support with route planning and transit coordination.",
  },
  {
    title: "Packing & Unpacking",
    image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
    description: "Secure packing, careful labeling, and neat unpacking for a smoother relocation experience.",
  },
  {
    title: "Furniture and Appliance Shifting",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    description: "Dedicated handling for bulky furniture, appliances, and delicate household items.",
  },
];

const SERVICE_OPTIONS = [
  "Home Relocation",
  "Office Relocation",
  "Local Shifting",
  "Domestic Relocation",
  "Packing & Unpacking",
  "Furniture and Appliance Shifting",
  "Other",
];

const MOVING_TYPES = [
  "Within the same locality",
  "Within the same city",
  "Intercity",
  "Interstate",
  "Other",
];

const PROPERTY_TYPES = [
  "Apartment",
  "Independent House",
  "Villa",
  "Office",
  "Commercial Space",
  "Other",
];

const PROPERTY_SIZES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK", "Other"];
const PACKING_OPTIONS = [
  "Complete packing",
  "Partial packing",
  "Loading and unloading",
  "Unpacking",
  "Transportation only",
  "Need guidance",
];
const INVENTORY_OPTIONS = [
  "Furniture",
  "Appliances",
  "Kitchen items",
  "Clothing and personal belongings",
  "Fragile items",
  "Other",
];
const LIFT_OPTIONS = ["Yes", "No", "Not sure"];
const FILE_LIMIT = 5;
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

const initialForm = {
  customer_name: "",
  mobile: "",
  email: "",
  services_required: [],
  moving_type: "",
  property_type: "",
  property_size: "",
  commercial_area: "",
  pickup_city: "",
  pickup_locality: "",
  pickup_address: "",
  pickup_floor: "",
  pickup_lift_availability: "",
  destination_city: "",
  destination_locality: "",
  destination_address: "",
  destination_floor: "",
  destination_lift_availability: "",
  preferred_move_date: "",
  flexible_date: false,
  packing_requirements: [],
  inventory_items: [],
  contact_consent: false,
  mobile_verified: false,
  otp_verification_ref: "",
};

function normalizeIndianMobile(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
}

export default function PackersAndMovers() {
  const [form, setForm] = useState(initialForm);
  const [uploads, setUploads] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const fileInputRef = useRef(null);

  const propertyIsCommercial = ["Office", "Commercial Space"].includes(form.property_type);

  const filePreviewMap = useMemo(
    () => Object.fromEntries(uploads.map((file) => [file.name, URL.createObjectURL(file)])),
    [uploads]
  );

  useEffect(() => {
    return () => {
      Object.values(filePreviewMap).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviewMap]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const toggleArrayValue = (key, value) => {
    setForm((prev) => {
      const existing = prev[key] || [];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];
      return { ...prev, [key]: next };
    });
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleServiceSelection = (serviceName) => {
    setForm((prev) => {
      const next = prev.services_required.includes(serviceName)
        ? prev.services_required.filter((item) => item !== serviceName)
        : [...prev.services_required, serviceName];
      return { ...prev, services_required: next };
    });
    setErrors((prev) => ({ ...prev, services_required: "" }));
  };

  const scrollToForm = () => {
    document.getElementById("moving-enquiry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const preselectService = (serviceName) => {
    handleServiceSelection(serviceName);
    scrollToForm();
  };

  const handleFiles = (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    const validFiles = [];
    for (const file of incomingFiles) {
      const type = file.type || "";
      if (!type.startsWith("image/")) {
        toast.error(`${file.name} is not a supported image format. Use JPG, PNG, or WebP.`);
        continue;
      }
      if (file.size > FILE_SIZE_LIMIT) {
        toast.error(`${file.name} exceeds the 5 MB file size limit.`);
        continue;
      }
      validFiles.push(file);
    }
    if (uploads.length + validFiles.length > FILE_LIMIT) {
      toast.error(`You can upload up to ${FILE_LIMIT} images.`);
      return;
    }
    setUploads((prev) => [...prev, ...validFiles]);
    event.target.value = "";
  };

  const removeUpload = (fileName) => {
    setUploads((prev) => prev.filter((file) => file.name !== fileName));
  };

  const validate = () => {
    const nextErrors = {};
    const phoneDigits = normalizeIndianMobile(form.mobile);

    if (!form.customer_name.trim() || form.customer_name.trim().length < 2) {
      nextErrors.customer_name = "Please enter your full name.";
    }
    if (phoneDigits.length !== 10) {
      nextErrors.mobile = "Please enter a valid 10-digit Indian mobile number.";
    }
    if (!form.services_required.length) {
      nextErrors.services_required = "Please select at least one service.";
    }
    if (!form.moving_type) {
      nextErrors.moving_type = "Please choose a moving type.";
    }
    if (!form.property_type) {
      nextErrors.property_type = "Please choose your current property type.";
    }
    if (!form.property_size) {
      nextErrors.property_size = "Please choose the property size.";
    }
    if (propertyIsCommercial && !form.commercial_area.trim()) {
      nextErrors.commercial_area = "Please provide the approximate commercial area.";
    }
    if (!form.pickup_city.trim()) {
      nextErrors.pickup_city = "Please enter the pickup city.";
    }
    if (!form.pickup_locality.trim()) {
      nextErrors.pickup_locality = "Please enter the pickup locality.";
    }
    if (!form.destination_city.trim()) {
      nextErrors.destination_city = "Please enter the destination city.";
    }
    if (!form.destination_locality.trim()) {
      nextErrors.destination_locality = "Please enter the destination locality.";
    }
    if (!form.packing_requirements.length) {
      nextErrors.packing_requirements = "Please select a packing requirement.";
    }
    if (!form.contact_consent) {
      nextErrors.contact_consent = "Please consent to be contacted by VisitSarva.";
    }
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstErrorKey = Object.keys(nextErrors)[0];
      document.getElementById(`field-${firstErrorKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        mobile: normalizeIndianMobile(form.mobile),
        email: form.email.trim(),
        uploaded_files: uploads.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      };

      const { data } = await api.post("/packers-movers-enquiries", payload);
      setSubmitResult(data);
      toast.success("Your moving enquiry has been submitted successfully.");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail[0]?.msg || "Submission failed. Please try again."
        : typeof detail === "string"
          ? detail
          : "Submission failed. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitResult) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text-primary flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="w-full max-w-xl rounded-2xl border border-vs-border bg-vs-surface p-8 text-center shadow-premium-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-vs-gold">Moving Enquiry</p>
            <h1 className="mt-4 font-display text-3xl font-semibold text-vs-text-primary">Thank you for choosing VisitSarva.</h1>
            <p className="mt-3 text-vs-text-secondary leading-relaxed">
              Your move request has been received and our team will contact you with the next steps.
            </p>
            <div className="mt-6 rounded-xl border border-vs-border bg-vs-bg px-4 py-3 text-sm text-vs-text-secondary">
              Enquiry ID: <span className="font-semibold text-vs-text-primary">{submitResult.packers_movers_enquiry_id}</span>
            </div>
            <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-vs-gold px-5 py-3 text-sm font-semibold text-slate-900 transition hover:opacity-90">
              Back to Home <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text-primary">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-vs-border bg-vs-surface">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_38%)]" />
          <div className="relative mx-auto grid max-w-[80rem] items-center gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,1.14fr)] lg:gap-0 lg:px-12 lg:py-0">
            <div className="relative z-10 max-w-xl py-8 sm:py-10 lg:py-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-vs-gold backdrop-blur-sm">
                <Truck className="h-3.5 w-3.5" /> Special Services · Packers & Movers
              </span>

              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.04] text-vs-text-primary sm:text-5xl lg:text-[3.4rem]">
                Moving Made Easier. <span className="text-vs-gold">Every Step of the Way.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-vs-text-secondary md:text-lg">
                Planning a home or office relocation? Share your moving requirements with VisitSarva and let our team help you connect with suitable packing and moving services.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="inline-flex items-center gap-2 rounded-full bg-vs-gold px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-vs-gold/20 transition hover:opacity-90"
                >
                  Get Moving Estimate <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#moving-services"
                  className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-white/80 px-6 py-3 text-sm font-semibold text-vs-text-primary transition hover:border-vs-gold/60 hover:text-vs-gold"
                >
                  Explore Our Services <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-3 text-xs text-vs-text-secondary">
                {[
                  "Residential and commercial moves",
                  "Trusted coordination support",
                  "End-to-end packing assistance",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-white/70 px-3 py-1.5 backdrop-blur-sm">
                    <Check className="h-3.5 w-3.5 text-vs-gold" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 lg:justify-self-end">
              <div className="relative overflow-hidden rounded-[1.8rem] border border-vs-border bg-vs-bg shadow-[0_20px_65px_rgba(15,23,42,0.12)] lg:rounded-l-[2.2rem] lg:rounded-r-none lg:shadow-[0_25px_80px_rgba(15,23,42,0.16)]">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[28%] bg-gradient-to-r from-vs-surface via-vs-surface/85 to-transparent lg:w-[32%]" />
                <img
                  src={PACKERS_MOVERS_HERO_IMAGE}
                  alt="VisitSarva packers and movers team loading a sofa into a moving truck"
                  loading="eager"
                  decoding="async"
                  className="h-[340px] w-full object-cover object-center sm:h-[420px] md:h-[500px] lg:h-[620px] lg:w-[760px]"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="moving-services" className="border-y border-vs-border bg-vs-surface py-16">
          <div className="mx-auto max-w-[80rem] px-6 lg:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-vs-gold">Relocation Solutions</p>
              <h2 className="font-display text-3xl font-semibold text-vs-text-primary md:text-4xl">Relocation Solutions for Every Move</h2>
              <p className="mt-4 text-base leading-relaxed text-vs-text-secondary">
                From local apartment shifts to full home and office moves, VisitSarva helps you plan a smoother relocation with packing support, transport coordination, and careful handling of your household essentials.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {SERVICE_CARDS.map((card) => (
                <div key={card.title} className="group overflow-hidden rounded-2xl border border-vs-border bg-vs-bg shadow-premium-sm transition duration-300 hover:-translate-y-1 hover:shadow-premium-md">
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-semibold text-vs-text-primary">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-vs-text-secondary">{card.description}</p>
                    <button
                      type="button"
                      onClick={() => preselectService(card.title)}
                      className="mt-5 inline-flex items-center gap-2 rounded-full border border-vs-border bg-vs-surface px-4 py-2 text-sm font-medium text-vs-text-primary transition hover:border-vs-gold/50 hover:text-vs-gold"
                    >
                      Enquire Now <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="moving-enquiry-form" className="mx-auto max-w-[80rem] px-6 py-20 lg:px-12">
          <div className="mb-8 max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-vs-gold">Moving Enquiry</p>
            <h2 className="font-display text-3xl font-semibold text-vs-text-primary md:text-4xl">Get Your Free Moving Estimate</h2>
            <p className="mt-4 text-base text-vs-text-secondary leading-relaxed">
              Tell us a little about your move. Our team will contact you to understand your requirements and discuss the next steps.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8 rounded-2xl border border-vs-border bg-vs-surface p-5 md:p-7">
              <div id="field-services_required" className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-vs-text-primary">Services required</h3>
                  <span className="text-xs text-vs-gold">Multiple selections allowed</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {SERVICE_OPTIONS.map((option) => {
                    const selected = form.services_required.includes(option);
                    return (
                      <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected ? "border-vs-gold bg-vs-gold/5 text-vs-text-primary" : "border-vs-border bg-vs-bg text-vs-text-secondary"}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleServiceSelection(option)}
                          className="h-4 w-4 accent-vs-gold"
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.services_required && <p className="text-sm text-red-500">{errors.services_required}</p>}
              </div>

              <div id="field-moving_type" className="space-y-4">
                <h3 className="text-lg font-semibold text-vs-text-primary">Moving type</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {MOVING_TYPES.map((option) => (
                    <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${form.moving_type === option ? "border-vs-gold bg-vs-gold/5 text-vs-text-primary" : "border-vs-border bg-vs-bg text-vs-text-secondary"}`}>
                      <input
                        type="radio"
                        name="moving_type"
                        checked={form.moving_type === option}
                        onChange={() => updateField("moving_type", option)}
                        className="h-4 w-4 accent-vs-gold"
                      />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
                {errors.moving_type && <p className="text-sm text-red-500">{errors.moving_type}</p>}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div id="field-property_type" className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Current property type</label>
                  <select value={form.property_type} onChange={(e) => updateField("property_type", e.target.value)} className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none ring-0 transition focus:border-vs-gold">
                    <option value="">Select property type</option>
                    {PROPERTY_TYPES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.property_type && <p className="text-sm text-red-500">{errors.property_type}</p>}
                </div>

                <div id="field-property_size" className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Property size</label>
                  <select value={form.property_size} onChange={(e) => updateField("property_size", e.target.value)} className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none ring-0 transition focus:border-vs-gold">
                    <option value="">Select property size</option>
                    {PROPERTY_SIZES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.property_size && <p className="text-sm text-red-500">{errors.property_size}</p>}
                </div>
              </div>

              {propertyIsCommercial && (
                <div id="field-commercial_area" className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Approximate commercial area</label>
                  <input value={form.commercial_area} onChange={(e) => updateField("commercial_area", e.target.value)} placeholder="e.g. 2500 sq ft" className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none transition focus:border-vs-gold" />
                  {errors.commercial_area && <p className="text-sm text-red-500">{errors.commercial_area}</p>}
                </div>
              )}

              <div className="grid gap-6 rounded-2xl border border-vs-border bg-vs-bg p-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-vs-text-primary">
                    <MapPin className="h-4 w-4 text-vs-gold" /> Pickup location
                  </div>
                  <div className="space-y-3">
                    <input value={form.pickup_city} onChange={(e) => updateField("pickup_city", e.target.value)} placeholder="Pickup city" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                    {errors.pickup_city && <p className="text-sm text-red-500">{errors.pickup_city}</p>}
                    <input value={form.pickup_locality} onChange={(e) => updateField("pickup_locality", e.target.value)} placeholder="Pickup locality" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                    {errors.pickup_locality && <p className="text-sm text-red-500">{errors.pickup_locality}</p>}
                    <input value={form.pickup_address} onChange={(e) => updateField("pickup_address", e.target.value)} placeholder="Optional complete address" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={form.pickup_floor} onChange={(e) => updateField("pickup_floor", e.target.value)} placeholder="Pickup floor" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                      <select value={form.pickup_lift_availability} onChange={(e) => updateField("pickup_lift_availability", e.target.value)} className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold">
                        <option value="">Lift availability</option>
                        {LIFT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-vs-text-primary">
                    <MapPin className="h-4 w-4 text-vs-gold" /> Destination location
                  </div>
                  <div className="space-y-3">
                    <input value={form.destination_city} onChange={(e) => updateField("destination_city", e.target.value)} placeholder="Destination city" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                    {errors.destination_city && <p className="text-sm text-red-500">{errors.destination_city}</p>}
                    <input value={form.destination_locality} onChange={(e) => updateField("destination_locality", e.target.value)} placeholder="Destination locality" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                    {errors.destination_locality && <p className="text-sm text-red-500">{errors.destination_locality}</p>}
                    <input value={form.destination_address} onChange={(e) => updateField("destination_address", e.target.value)} placeholder="Optional complete address" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={form.destination_floor} onChange={(e) => updateField("destination_floor", e.target.value)} placeholder="Destination floor" className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold" />
                      <select value={form.destination_lift_availability} onChange={(e) => updateField("destination_lift_availability", e.target.value)} className="w-full rounded-xl border border-vs-border bg-vs-surface px-3 py-3 text-sm outline-none transition focus:border-vs-gold">
                        <option value="">Lift availability</option>
                        {LIFT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Preferred moving date</label>
                  <input type="date" value={form.preferred_move_date} onChange={(e) => updateField("preferred_move_date", e.target.value)} className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none transition focus:border-vs-gold" />
                </div>
                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary">
                    <span>Flexible date / Not decided yet</span>
                    <input type="checkbox" checked={form.flexible_date} onChange={(e) => updateField("flexible_date", e.target.checked)} className="h-4 w-4 accent-vs-gold" />
                  </label>
                </div>
              </div>

              <div id="field-packing_requirements" className="space-y-4">
                <h3 className="text-lg font-semibold text-vs-text-primary">Packing requirements</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {PACKING_OPTIONS.map((option) => (
                    <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${form.packing_requirements.includes(option) ? "border-vs-gold bg-vs-gold/5 text-vs-text-primary" : "border-vs-border bg-vs-bg text-vs-text-secondary"}`}>
                      <input type="checkbox" checked={form.packing_requirements.includes(option)} onChange={() => toggleArrayValue("packing_requirements", option)} className="h-4 w-4 accent-vs-gold" />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
                {errors.packing_requirements && <p className="text-sm text-red-500">{errors.packing_requirements}</p>}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-vs-text-primary">Approximate inventory</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {INVENTORY_OPTIONS.map((option) => (
                    <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${form.inventory_items.includes(option) ? "border-vs-gold bg-vs-gold/5 text-vs-text-primary" : "border-vs-border bg-vs-bg text-vs-text-secondary"}`}>
                      <input type="checkbox" checked={form.inventory_items.includes(option)} onChange={() => toggleArrayValue("inventory_items", option)} className="h-4 w-4 accent-vs-gold" />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-vs-border bg-vs-bg p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-vs-text-primary">
                  <FileImage className="h-4 w-4 text-vs-gold" /> Optional property image upload
                </div>
                <div className="mt-2 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-vs-border bg-vs-surface px-4 py-2 text-sm font-medium text-vs-text-primary transition hover:border-vs-gold/60 hover:text-vs-gold"
                  >
                    <Upload className="h-4 w-4" /> Add photos
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
                  {uploads.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {uploads.map((file) => (
                        <div key={file.name} className="relative overflow-hidden rounded-xl border border-vs-border bg-vs-surface">
                          <img src={filePreviewMap[file.name]} alt={file.name} className="h-28 w-full object-cover" />
                          <button type="button" onClick={() => removeUpload(file.name)} className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-1.5 text-white">
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="px-3 py-2 text-xs text-vs-text-secondary">{file.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-6 rounded-2xl border border-vs-border bg-vs-surface p-5 md:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-vs-gold/10 text-vs-gold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-vs-gold">Customer details</p>
                  <h3 className="mt-1 text-lg font-semibold text-vs-text-primary">Contact info</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Customer name</label>
                  <input value={form.customer_name} onChange={(e) => updateField("customer_name", e.target.value)} placeholder="Enter your full name" className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none transition focus:border-vs-gold" />
                  {errors.customer_name && <p className="text-sm text-red-500">{errors.customer_name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Indian mobile number</label>
                  <input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} placeholder="e.g. 9876543210" className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none transition focus:border-vs-gold" />
                  {errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Email address (optional)</label>
                  <input value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none transition focus:border-vs-gold" />
                </div>
              </div>

              <div className="rounded-xl border border-vs-border bg-vs-bg p-4">
                <label className="flex items-start gap-3 text-sm text-vs-text-primary">
                  <input type="checkbox" checked={form.contact_consent} onChange={(e) => updateField("contact_consent", e.target.checked)} className="mt-1 h-4 w-4 accent-vs-gold" />
                  <span>
                    I agree to be contacted by VisitSarva regarding my packing and moving enquiry.
                  </span>
                </label>
                {errors.contact_consent && <p className="mt-2 text-sm text-red-500">{errors.contact_consent}</p>}
              </div>

              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-vs-gold px-5 py-3 text-sm font-semibold text-slate-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Moving Enquiry"}
              </button>

              <div className="rounded-xl border border-vs-border bg-vs-bg p-4 text-xs text-vs-text-secondary">
                <div className="flex items-center gap-2 font-medium text-vs-text-primary">
                  <ShieldCheck className="h-4 w-4 text-vs-gold" /> Privacy first
                </div>
                <p className="mt-2 leading-relaxed">
                  We use the contact details you provide to understand your move requirements and respond with the right assistance.
                </p>
              </div>
            </aside>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
