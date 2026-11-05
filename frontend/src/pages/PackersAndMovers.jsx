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

const makeIllustration = (title, start, end, accent) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
        <linearGradient id="panel" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0.05)"/>
        </linearGradient>
      </defs>
      <rect width="800" height="520" fill="url(#bg)"/>
      <circle cx="110" cy="112" r="56" fill="rgba(255,255,255,0.14)"/>
      <circle cx="684" cy="112" r="78" fill="rgba(255,255,255,0.12)"/>
      <path d="M0 384C120 340 178 324 252 338C320 350 380 398 458 396C540 394 622 344 800 390V520H0Z" fill="rgba(15,23,42,0.18)"/>
      <rect x="120" y="148" width="560" height="220" rx="26" fill="url(#panel)" stroke="rgba(255,255,255,0.30)"/>
      <rect x="170" y="214" width="180" height="96" rx="18" fill="rgba(255,255,255,0.12)"/>
      <rect x="382" y="214" width="230" height="18" rx="9" fill="rgba(255,255,255,0.24)"/>
      <rect x="382" y="252" width="180" height="18" rx="9" fill="rgba(255,255,255,0.16)"/>
      <rect x="382" y="290" width="140" height="18" rx="9" fill="rgba(255,255,255,0.12)"/>
      <rect x="164" y="170" width="96" height="18" rx="9" fill="${accent}" opacity="0.9"/>
      <text x="400" y="430" fill="rgba(255,255,255,0.96)" font-size="40" font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle">${title}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const HERO_BACKGROUND = makeIllustration("Packers & Movers", "#eef3f7", "#a9b0bc", "#facc15");

const SERVICE_CARDS = [
  {
    title: "Home Relocation",
    image: makeIllustration("Home Relocation", "#d7dfe6", "#77829a", "#f8c65b"),
    description: "Move your home with planned packing, safe loading, and on-time delivery for every room.",
  },
  {
    title: "Office Relocation",
    image: makeIllustration("Office Relocation", "#dfeaf7", "#7e96b8", "#7dd3fc"),
    description: "Relocate workstations, equipment, and office essentials with minimal downtime.",
  },
  {
    title: "Local Shifting",
    image: makeIllustration("Local Shifting", "#d9f1ea", "#5f9e98", "#f4d35e"),
    description: "Quick and reliable moving support for same-city moves with flexible scheduling.",
  },
  {
    title: "Domestic Relocation",
    image: makeIllustration("Domestic Relocation", "#f2e6d7", "#b17b53", "#fbbf24"),
    description: "Intercity and long-distance moving support with route planning and transit coordination.",
  },
  {
    title: "Packing & Unpacking",
    image: makeIllustration("Packing & Unpacking", "#e5ebf8", "#7e88b5", "#c084fc"),
    description: "Secure packing, careful labeling, and neat unpacking for a smoother relocation experience.",
  },
  {
    title: "Furniture and Appliance Shifting",
    image: makeIllustration("Furniture & Appliance", "#ebebf2", "#7f8aa8", "#f59e0b"),
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
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const fileInputRef = useRef(null);

  const propertyIsCommercial = ["Office", "Commercial Space"].includes(form.property_type);

  useEffect(() => {
    if (!countdown) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

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
    if (!form.mobile_verified) {
      nextErrors.mobile = "Please verify your mobile number with OTP before submitting.";
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

  const sendOtp = async () => {
    const normalized = normalizeIndianMobile(form.mobile);
    if (normalized.length !== 10) {
      toast.error("Please enter a valid 10-digit Indian mobile number before requesting OTP.");
      return;
    }

    setSendingOtp(true);
    try {
      await api.post("/otp/send", { mobile: normalized });
      setOtpSent(true);
      setCountdown(45);
      setOtpVerified(false);
      setForm((prev) => ({ ...prev, mobile_verified: false, otp_verification_ref: "" }));
      toast.success("OTP sent successfully. Please check your registered email inbox.");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Unable to send OTP right now.";
      toast.error(message);
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const normalized = normalizeIndianMobile(form.mobile);
    if (normalized.length !== 10) {
      toast.error("Please enter a valid mobile number first.");
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const { data } = await api.post("/otp/verify", { mobile: normalized, otp: otpCode });
      if (data?.verified) {
        setOtpVerified(true);
        setForm((prev) => ({ ...prev, mobile_verified: true, otp_verification_ref: data?.message || "otp-verified" }));
        setErrors((prev) => ({ ...prev, mobile: "" }));
        toast.success("Mobile number verified successfully.");
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "OTP verification failed.";
      toast.error(message);
    } finally {
      setVerifyingOtp(false);
    }
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
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.87) 35%, rgba(255,255,255,0.4) 65%, rgba(255,255,255,0.12) 100%), url("${HERO_BACKGROUND}")`,
            }}
          />
          <div className="relative mx-auto max-w-[80rem] px-6 py-20 lg:py-28 lg:px-12">
            <div className="max-w-2xl space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-vs-gold backdrop-blur-sm">
                <Truck className="h-3.5 w-3.5" /> Special Services · Packers & Movers
              </span>
              <h1 className="font-display text-4xl font-semibold leading-tight text-vs-text-primary md:text-5xl lg:text-[3.5rem]">
                Moving Made Easier. <span className="text-vs-gold">Every Step of the Way.</span>
              </h1>
              <p className="max-w-xl text-lg text-vs-text-secondary leading-relaxed">
                Planning a home or office relocation? Share your moving requirements with VisitSarva and let our team help you connect with suitable packing and moving services.
              </p>
              <div className="flex flex-wrap gap-4">
                <button type="button" onClick={scrollToForm} className="inline-flex items-center gap-2 rounded-full bg-vs-gold px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-vs-gold/20 transition hover:opacity-90">
                  Get Moving Estimate <ArrowRight className="h-4 w-4" />
                </button>
                <a href="#moving-services" className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-white/70 px-6 py-3 text-sm font-semibold text-vs-text-primary transition hover:border-vs-gold/60 hover:text-vs-gold">
                  Explore Our Services <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-vs-text-secondary">
                {[
                  "Residential and commercial moves",
                  "Trusted coordination support",
                  "End-to-end packing assistance",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-white/60 px-3 py-1.5">
                    <Check className="h-3.5 w-3.5 text-vs-gold" /> {item}
                  </span>
                ))}
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
                    <img src={card.image} alt={card.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
                  <div className="flex gap-2">
                    <input value={form.mobile} onChange={(e) => {
                      const nextValue = e.target.value;
                      updateField("mobile", nextValue);
                      setOtpSent(false);
                      setOtpVerified(false);
                      setOtpCode("");
                      setCountdown(0);
                      setForm((prev) => ({ ...prev, mobile_verified: false, otp_verification_ref: "" }));
                    }} placeholder="e.g. 9876543210" className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none transition focus:border-vs-gold" />
                    <button type="button" onClick={sendOtp} disabled={sendingOtp || !form.mobile} className="rounded-xl bg-vs-gold px-3 py-3 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
                      {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                    </button>
                  </div>
                  {errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
                  {countdown > 0 && <p className="text-xs text-vs-text-secondary">OTP sent. Resend available in {countdown}s.</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-vs-text-primary">Enter OTP</label>
                  <div className="flex gap-2">
                    <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} placeholder="6-digit OTP" className="w-full rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-sm text-vs-text-primary outline-none transition focus:border-vs-gold" />
                    <button type="button" onClick={verifyOtp} disabled={verifyingOtp || !otpCode || otpCode.length !== 6} className="rounded-xl border border-vs-border bg-vs-bg px-3 py-3 text-xs font-semibold text-vs-text-primary disabled:cursor-not-allowed disabled:opacity-60">
                      {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  {otpSent && !otpVerified && <p className="text-xs text-vs-text-secondary">Use the 6-digit OTP sent to your configured email address for verification.</p>}
                  {otpVerified && <p className="text-xs font-medium text-emerald-600">Mobile number verified successfully.</p>}
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
                  <ShieldCheck className="h-4 w-4 text-vs-gold" /> Secure verification
                </div>
                <p className="mt-2 leading-relaxed">
                  We only accept a final enquiry once your mobile number is verified through the backend OTP service. No OTP credentials are exposed in the frontend.
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
