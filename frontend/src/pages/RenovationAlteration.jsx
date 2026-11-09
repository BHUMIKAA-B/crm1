import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Hammer,
  Home,
  UtensilsCrossed,
  Bath,
  Maximize2,
  Layers,
  Paintbrush,
  Sparkles,
  Phone,
  MessageCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Upload,
  X,
  ShieldCheck,
  User,
  MapPin,
  IndianRupee,
  Calendar,
  AlertCircle,
  FileText,
  Building,
  Check,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

/* ─── CONSTANTS & OPTIONS ─────────────────────────────────────────────────── */

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=85";

const SERVICE_CARDS = [
  {
    id: "complete-home",
    title: "Complete Home Renovation",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
    description:
      "Full home transformation, interior upgrades, and comprehensive renovation coordination for your entire residence.",
    serviceKey: "Complete Home Renovation",
  },
  {
    id: "kitchen-renovation",
    title: "Kitchen Renovation",
    image:
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80",
    description:
      "Kitchen redesign, cabinet and countertop upgrades, storage optimization, and modern ergonomic layout improvements.",
    serviceKey: "Kitchen Renovation",
  },
  {
    id: "bathroom-renovation",
    title: "Bathroom Renovation",
    image:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80",
    description:
      "Bathroom upgrades, modern sanitary fittings, fixtures, non-slip tiling, and comprehensive waterproofing solutions.",
    serviceKey: "Bathroom Renovation",
  },
  {
    id: "structural-alterations",
    title: "Structural Alterations",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    description:
      "Internal layout modifications, partition changes, and space optimization. Note: Structural modifications require appropriate professional assessment and statutory approvals.",
    serviceKey: "Structural Alterations",
    notice: "Professional assessment & approvals required",
  },
  {
    id: "flooring-tiling",
    title: "Flooring and Tiling",
    image:
      "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=900&q=80",
    description:
      "Floor replacement, vitrified and wooden tile installation, subfloor leveling, and surface enhancements.",
    serviceKey: "Flooring and Tiling",
  },
  {
    id: "painting-ceiling-wall",
    title: "Painting, Ceiling and Wall Improvements",
    image:
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80",
    description:
      "Wall upgrades, designer false ceiling, architectural surface finishing, lighting provision, and interior enhancements.",
    serviceKey: "Painting, Ceiling and Wall Improvements",
  },
];

const SERVICE_OPTIONS = [
  "Complete Home Renovation",
  "Kitchen Renovation",
  "Bathroom Renovation",
  "Structural Alterations",
  "Flooring and Tiling",
  "Painting and Wall Improvements",
  "False Ceiling",
  "Other",
];

const PROPERTY_TYPES = [
  "Apartment",
  "Independent House",
  "Villa",
  "Commercial Property",
  "Office",
  "Other",
];

const PROPERTY_SIZES = [
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
  "5+ BHK",
  "Other",
];

const PROPERTY_CONDITIONS = [
  "Newly purchased property",
  "Existing property requiring renovation",
  "Partially renovated property",
  "Property requiring major alterations",
];

const RENOVATION_SCOPES = [
  "Single room",
  "Multiple rooms",
  "Kitchen only",
  "Bathroom only",
  "Partial property",
  "Entire property",
];

const BUDGET_RANGES = [
  "Below ₹1 lakh",
  "₹1 lakh – ₹3 lakh",
  "₹3 lakh – ₹5 lakh",
  "₹5 lakh – ₹10 lakh",
  "₹10 lakh – ₹20 lakh",
  "Above ₹20 lakh",
  "Not decided yet",
];

const START_TIMELINES = [
  "Within 15 days",
  "Within one month",
  "Within 1–3 months",
  "Later",
  "Not decided",
];

const WHY_CHOOSE_ITEMS = [
  {
    title: "Multiple Renovation Service Options",
    description:
      "From single-room touchups and kitchen remodels to full-property transformations, choose exactly what fits your property.",
    icon: Layers,
  },
  {
    title: "Requirement-Based Consultation",
    description:
      "Personalized discussions to understand your layout, usage, aesthetic preferences, and practical constraints before planning.",
    icon: User,
  },
  {
    title: "Assistance with Renovation Planning",
    description:
      "Structured advisory on phasing, scope clarity, budget alignment, and selecting the right solutions for longevity.",
    icon: Sparkles,
  },
  {
    title: "Convenient Enquiry Process",
    description:
      "Quick online requirement sharing without tedious technical paperwork or upfront drawing submissions.",
    icon: CheckCircle2,
  },
  {
    title: "Coordination with Relevant Service Professionals",
    description:
      "Connect with experienced civil, modular, tiling, painting, and structural specialists suited to your specific scope.",
    icon: Hammer,
  },
  {
    title: "Support for Residential & Commercial Requirements",
    description:
      "Dedicated focus whether you are renovating an apartment, villa, independent house, or commercial workspace.",
    icon: Building,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Share Your Requirements",
    description:
      "Submit your property details, preferred services, approximate budget, and expected timeline through our simple form.",
  },
  {
    step: "02",
    title: "Our Team Reviews Your Enquiry",
    description:
      "Our renovation coordination team reviews the scope and assesses the necessary trade specialists and timelines.",
  },
  {
    step: "03",
    title: "Consultation and Site Assessment",
    description:
      "We connect with you for a detailed requirement discussion and arrange an on-site inspection for precise evaluation where needed.",
  },
  {
    step: "04",
    title: "Discuss Estimate and Next Steps",
    description:
      "Review a tailored, itemized quotation reflecting real material options, labor scope, and agreed schedules before commencing work.",
  },
];

const FAQS = [
  {
    q: "What renovation services are available?",
    a: "VisitSarva helps you explore a wide spectrum of renovation services including Complete Home Renovation, Kitchen Renovation, Bathroom Upgrades, Structural Alterations, Flooring and Tiling, False Ceiling, Wall Improvements, and Surface Finishes.",
  },
  {
    q: "Can I renovate only one room?",
    a: "Yes, you can easily renovate a single room, such as a master bedroom, study, or living lounge. In our enquiry form, select 'Single room' under Renovation Scope.",
  },
  {
    q: "Do you support complete home renovation?",
    a: "Yes. Complete home renovation is one of our key offerings. It covers civil modifications, electrical, plumbing, false ceiling, flooring, modular joinery, and full interior painting.",
  },
  {
    q: "Can I request kitchen or bathroom renovation?",
    a: "Absolutely. We offer dedicated focus on modular kitchen remodels (cabinets, countertops, backsplash) and bathroom renovations (waterproofing, piping, plumbing fixtures, and wall/floor tiles).",
  },
  {
    q: "Can I upload property photos or floor plans?",
    a: "Yes. You can optionally upload photos of your current space or an architectural floor plan (in JPG, PNG, WebP, or PDF formats) to give our team initial context.",
  },
  {
    q: "How is the renovation quotation calculated?",
    a: "Final renovation estimates depend on property condition, exact on-site measurements, material selection, labor scope, architectural design, and site access. An itemized proposal is shared after detailed consultation and site assessment.",
  },
  {
    q: "Is a site inspection necessary?",
    a: "For most significant alterations, civil work, or full-home renovations, an on-site inspection is recommended so our technical team can inspect wall stability, plumbing lines, levels, and dampness before quoting.",
  },
  {
    q: "Can I select multiple renovation services?",
    a: "Yes. You can select multiple service categories in the enquiry form (for example, Kitchen Renovation + Flooring and Tiling + False Ceiling). Our team will coordinate all aspects under one plan.",
  },
  {
    q: "How soon can the work begin?",
    a: "Timelines depend on your preference and the scope. In the enquiry form, choose from 'Within 15 days', 'Within one month', 'Within 1–3 months', or 'Later'. After quotation approval and site handover, work is scheduled promptly.",
  },
  {
    q: "Can structural alterations be carried out?",
    a: "Structural alterations—such as removing or creating internal partition walls, enlarging doorway openings, or modifying layouts—can only be carried out after proper structural engineering assessment and obtaining necessary building/society approvals. Load-bearing walls and building structural members cannot be compromised.",
  },
];

const WHATSAPP_NUMBER = "919108070000";
const CALL_NUMBER = "+91 91080 70000";

function normalizeIndianMobile(val) {
  const digits = (val || "").replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
}

export default function RenovationAlteration() {
  const formRef = useRef(null);
  const categoriesRef = useRef(null);

  // Form State
  const [form, setForm] = useState({
    customer_name: "",
    mobile: "",
    email: "",
    contact_consent: false,
    services_required: [],
    property_type: "",
    property_size: "",
    commercial_area: "",
    property_condition: "",
    renovation_scope: "",
    city: "Bengaluru",
    area_locality: "",
    additional_address: "",
    budget_range: "",
    expected_start_date: "",
    requirement_description: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Accordion state
  const [openFaq, setOpenFaq] = useState(null);

  const isCommercial = ["Commercial Property", "Office"].includes(form.property_type);

  // Scroll helpers
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToCategories = () => {
    categoriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const preselectServiceAndScroll = (serviceTitle) => {
    setForm((prev) => {
      const exists = prev.services_required.includes(serviceTitle);
      const next = exists ? prev.services_required : [...prev.services_required, serviceTitle];
      return { ...prev, services_required: next };
    });
    setErrors((prev) => ({ ...prev, services_required: "" }));
    toast.success(`Selected "${serviceTitle}"`);
    setTimeout(scrollToForm, 100);
  };

  const toggleService = (service) => {
    setForm((prev) => {
      const exists = prev.services_required.includes(service);
      const next = exists
        ? prev.services_required.filter((s) => s !== service)
        : [...prev.services_required, service];
      return { ...prev, services_required: next };
    });
    setErrors((prev) => ({ ...prev, services_required: "" }));
  };

  const setField = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // File Upload Handling
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const valid = [];

    for (const f of files) {
      if (!allowed.includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
        toast.error(`${f.name}: Unsupported format. Use JPG, PNG, WebP or PDF.`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: Exceeds 10MB limit.`);
        continue;
      }
      valid.push({
        file: f,
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(2) + " MB",
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      });
    }

    if (uploadedFiles.length + valid.length > 8) {
      toast.error("You can upload up to 8 files.");
      return;
    }

    setUploadedFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => {
      const item = prev[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Validation
  const validateForm = () => {
    const errs = {};
    if (!form.customer_name.trim() || form.customer_name.trim().length < 2) {
      errs.customer_name = "Please enter your full name (minimum 2 characters).";
    }

    const digits = normalizeIndianMobile(form.mobile);
    if (digits.length !== 10 || !["6", "7", "8", "9"].includes(digits[0])) {
      errs.mobile = "Please enter a valid 10-digit Indian mobile number.";
    }

    if (!form.services_required.length) {
      errs.services_required = "Please select at least one renovation service category.";
    }

    if (!form.property_type) {
      errs.property_type = "Please select your property type.";
    }

    if (!form.property_size) {
      errs.property_size = "Please select property size.";
    }

    if (isCommercial && !form.commercial_area.trim()) {
      errs.commercial_area = "Please provide approximate area (sq ft) for commercial property.";
    }

    if (!form.property_condition) {
      errs.property_condition = "Please select current property condition.";
    }

    if (!form.renovation_scope) {
      errs.renovation_scope = "Please select renovation scope.";
    }

    if (!form.city.trim()) {
      errs.city = "City is mandatory.";
    }

    if (!form.area_locality.trim()) {
      errs.area_locality = "Locality is mandatory.";
    }

    if (!form.budget_range) {
      errs.budget_range = "Please choose an approximate budget range.";
    }

    if (!form.expected_start_date) {
      errs.expected_start_date = "Please specify expected start timeline.";
    }

    if (!form.contact_consent) {
      errs.contact_consent = "Consent to be contacted is mandatory to proceed.";
    }

    return errs;
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstField = Object.keys(errs)[0];
      document.getElementById(`field-${firstField}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      toast.error("Please fill in all mandatory fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // Prepare file records
      const filesMetadata = uploadedFiles.map((f) => ({
        filename: f.name,
        size_label: f.size,
      }));

      const payload = {
        customer_name: form.customer_name.trim(),
        mobile: normalizeIndianMobile(form.mobile),
        email: form.email.trim(),
        contact_consent: form.contact_consent,
        services_required: form.services_required,
        property_type: form.property_type,
        property_size: form.property_size,
        commercial_area: form.commercial_area.trim(),
        property_condition: form.property_condition,
        renovation_scope: form.renovation_scope,
        city: form.city.trim(),
        area_locality: form.area_locality.trim(),
        additional_address: form.additional_address.trim(),
        budget_range: form.budget_range,
        expected_start_date: form.expected_start_date,
        requirement_description: form.requirement_description.trim(),
        uploaded_files: filesMetadata,
      };

      const { data } = await api.post("/renovation-enquiries", payload);

      if (data?.success) {
        setSubmitResult(data);
        toast.success("Enquiry received successfully!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        throw new Error(data?.message || "Submission failed");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail[0]?.msg
        : typeof detail === "string"
        ? detail
        : "Submission could not be completed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // If submitted, show full confirmation view
  if (submitResult) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text-primary flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl w-full bg-vs-surface border border-vs-border rounded-2xl p-8 sm:p-10 shadow-xl text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-full text-xs font-mono font-bold tracking-wider mb-3">
                ENQUIRY ID: {submitResult.renovation_enquiry_id}
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-vs-text-primary">
                Thank you for choosing VisitSarva.
              </h1>
              <p className="text-vs-text-secondary mt-3 leading-relaxed text-sm sm:text-base">
                Your renovation enquiry has been received. Our team will contact you shortly to
                understand your needs and discuss next steps.
              </p>
            </div>

            <div className="bg-vs-bg/60 border border-vs-border rounded-xl p-5 text-left text-xs sm:text-sm space-y-2.5 text-vs-text-secondary">
              <div className="flex justify-between">
                <span>Customer Name:</span>
                <strong className="text-vs-text-primary">{form.customer_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Mobile:</span>
                <strong className="text-vs-text-primary">+91 {normalizeIndianMobile(form.mobile)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Selected Services:</span>
                <strong className="text-vs-text-primary text-right max-w-[65%]">
                  {form.services_required.join(", ")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Property:</span>
                <strong className="text-vs-text-primary">
                  {form.property_type} ({form.property_size})
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <strong className="text-vs-text-primary">
                  {form.area_locality}, {form.city}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Approximate Budget:</span>
                <strong className="text-vs-text-primary">{form.budget_range}</strong>
              </div>
              <div className="flex justify-between">
                <span>Timeline:</span>
                <strong className="text-vs-text-primary">{form.expected_start_date}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/"
                className="flex-1 py-3 px-5 rounded-xl bg-vs-primary text-white font-medium text-sm hover:opacity-95 transition-opacity text-center"
              >
                Return to Homepage
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmitResult(null);
                  setForm({
                    customer_name: "",
                    mobile: "",
                    email: "",
                    contact_consent: false,
                    services_required: [],
                    property_type: "",
                    property_size: "",
                    commercial_area: "",
                    property_condition: "",
                    renovation_scope: "",
                    city: "Bengaluru",
                    area_locality: "",
                    additional_address: "",
                    budget_range: "",
                    expected_start_date: "",
                    requirement_description: "",
                  });
                  setUploadedFiles([]);
                }}
                className="flex-1 py-3 px-5 rounded-xl border border-vs-border text-vs-text-primary font-medium text-sm hover:bg-vs-bg transition-colors"
              >
                Submit Another Enquiry
              </button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text-primary flex flex-col antialiased selection:bg-vs-primary/10 selection:text-vs-primary">
      <Navbar />

      {/* ── 2. PREMIUM HERO BANNER ─────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden border-b border-vs-border bg-gradient-to-b from-vs-surface via-vs-bg to-vs-bg">
        <div className="max-w-[84rem] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Text & Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold tracking-wide uppercase">
                <Hammer className="w-3.5 h-3.5 text-amber-600" />
                VisitSarva Special Services
              </div>

              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-vs-text-primary leading-[1.15]">
                Transform Your Space. <span className="text-vs-gold">Make It Yours.</span>
              </h1>

              <p className="text-base sm:text-lg text-vs-text-secondary leading-relaxed max-w-xl">
                From thoughtful alterations to complete home renovations, VisitSarva helps you
                explore the right solutions for your property.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="px-6 py-3.5 rounded-xl bg-vs-primary text-white font-medium text-sm sm:text-base hover:opacity-95 shadow-md shadow-vs-primary/20 transition-all flex items-center justify-center gap-2 group"
                >
                  Get Free Consultation
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={scrollToCategories}
                  className="px-6 py-3.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary font-medium text-sm sm:text-base hover:bg-vs-bg transition-colors flex items-center justify-center gap-2"
                >
                  Explore Renovation Services
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-vs-border text-xs sm:text-sm text-vs-text-secondary">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Quality Assured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Transparent INR</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Guided Planning</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Large Renovation Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-6 relative"
            >
              <div className="relative rounded-2xl overflow-hidden border border-vs-border shadow-2xl aspect-[4/3] sm:aspect-[16/11]">
                <img
                  src={HERO_IMAGE}
                  alt="Modern architectural home undergoing renovation improvements by professionals"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                  <p className="font-semibold text-sm sm:text-base">Comprehensive Space Upgrades</p>
                  <p className="text-xs text-white/80 mt-0.5">
                    Civil work, modular joinery, false ceiling, sanitary fittings & precision finishes.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. SERVICE DESCRIPTION ─────────────────────────────────────────── */}
      <section className="py-16 bg-vs-surface border-b border-vs-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <p className="text-xs font-mono font-bold tracking-widest text-vs-gold uppercase">
            TAILORED PROPERTY IMPROVEMENTS
          </p>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-vs-text-primary">
            Renovation Solutions Designed Around Your Space
          </h2>
          <p className="text-base sm:text-lg text-vs-text-secondary leading-relaxed pt-2">
            Whether you are refreshing a single room or planning a larger property transformation,
            explore renovation and alteration services suited to your needs. Share your requirements
            with VisitSarva and our team will help coordinate the next steps.
          </p>
        </div>
      </section>

      {/* ── 4. VISUAL SERVICE CATEGORY CARDS ─────────────────────────────────── */}
      <section ref={categoriesRef} id="renovation-service-categories" className="py-20 lg:py-28">
        <div className="max-w-[84rem] mx-auto px-4 sm:px-6 lg:px-12 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-mono font-bold tracking-widest text-vs-gold uppercase mb-1">
                SERVICE CATEGORIES
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-vs-text-primary">
                Explore Specialized Renovation Solutions
              </h2>
            </div>
            <p className="text-sm text-vs-text-secondary max-w-md">
              Click &quot;Enquire Now&quot; on any card to preselect that service category and
              scroll directly to the consultation form.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICE_CARDS.map((card) => {
              const isSelected = form.services_required.includes(card.serviceKey);
              return (
                <div
                  key={card.id}
                  className={`group relative flex flex-col rounded-2xl overflow-hidden border bg-vs-surface transition-all duration-300 shadow-sm hover:shadow-xl ${
                    isSelected ? "border-amber-500 ring-2 ring-amber-500/20" : "border-vs-border"
                  }`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={card.image}
                      alt={card.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {card.notice && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-amber-600/90 text-white text-[11px] font-medium backdrop-blur-sm shadow">
                        {card.notice}
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1 shadow">
                        <Check className="w-3 h-3" /> Preselected
                      </span>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-display text-xl font-bold text-vs-text-primary group-hover:text-vs-primary transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-vs-text-secondary leading-relaxed mt-2">
                        {card.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-vs-border/60">
                      <button
                        type="button"
                        onClick={() => preselectServiceAndScroll(card.serviceKey)}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                          isSelected
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                            : "bg-vs-primary text-white hover:opacity-90"
                        }`}
                      >
                        {isSelected ? "Selected — Enquire Now" : "Enquire Now"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5 & 6. RENOVATION ENQUIRY FORM ─────────────────────────────────── */}
      <section
        ref={formRef}
        id="renovation-enquiry-form"
        className="py-20 bg-vs-surface border-y border-vs-border"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-10">
            <span className="px-3.5 py-1 rounded-full bg-vs-gold/10 text-vs-gold border border-vs-gold/30 text-xs font-mono font-bold tracking-wider uppercase">
              CONSULTATION ENQUIRY
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-vs-text-primary">
              Tell Us About Your Renovation
            </h2>
            <p className="text-base text-vs-text-secondary max-w-2xl mx-auto">
              Share a few details about your property and renovation requirements. Our team will
              contact you to understand your needs and discuss the next steps.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 bg-vs-bg border border-vs-border rounded-2xl p-6 sm:p-10 shadow-lg">
            {/* A. Renovation Services Required (Multiple) */}
            <div id="field-services_required" className="space-y-3">
              <label className="block text-sm font-semibold text-vs-text-primary">
                A. Renovation service required <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-vs-text-secondary ml-2">
                  (Select all that apply)
                </span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {SERVICE_OPTIONS.map((srv) => {
                  const checked = form.services_required.includes(srv);
                  return (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => toggleService(srv)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center gap-2 ${
                        checked
                          ? "bg-vs-primary text-white border-vs-primary shadow-sm"
                          : "bg-vs-surface text-vs-text-primary border-vs-border hover:border-vs-text-muted"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border ${
                          checked ? "bg-white text-vs-primary border-white" : "border-vs-border"
                        }`}
                      >
                        {checked && "✓"}
                      </span>
                      {srv}
                    </button>
                  );
                })}
              </div>
              {errors.services_required && (
                <p className="text-xs text-red-500 font-medium">{errors.services_required}</p>
              )}
            </div>

            {/* B & C. Property Type & Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div id="field-property_type" className="space-y-2">
                <label className="block text-sm font-semibold text-vs-text-primary">
                  B. Property type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.property_type}
                  onChange={(e) => setField("property_type", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                >
                  <option value="">Select Property Type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.property_type && (
                  <p className="text-xs text-red-500 font-medium">{errors.property_type}</p>
                )}
              </div>

              <div id="field-property_size" className="space-y-2">
                <label className="block text-sm font-semibold text-vs-text-primary">
                  C. Property size <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.property_size}
                  onChange={(e) => setField("property_size", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                >
                  <option value="">Select Size / BHK</option>
                  {PROPERTY_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.property_size && (
                  <p className="text-xs text-red-500 font-medium">{errors.property_size}</p>
                )}
              </div>
            </div>

            {/* Conditional Commercial Area */}
            {isCommercial && (
              <div id="field-commercial_area" className="space-y-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <label className="block text-sm font-semibold text-vs-text-primary">
                  Approximate Commercial Area (in sq ft) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1,500 sq ft"
                  value={form.commercial_area}
                  onChange={(e) => setField("commercial_area", e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                />
                {errors.commercial_area && (
                  <p className="text-xs text-red-500 font-medium">{errors.commercial_area}</p>
                )}
              </div>
            )}

            {/* D & E. Property Condition & Renovation Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div id="field-property_condition" className="space-y-2">
                <label className="block text-sm font-semibold text-vs-text-primary">
                  D. Property condition <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.property_condition}
                  onChange={(e) => setField("property_condition", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                >
                  <option value="">Select Condition</option>
                  {PROPERTY_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.property_condition && (
                  <p className="text-xs text-red-500 font-medium">{errors.property_condition}</p>
                )}
              </div>

              <div id="field-renovation_scope" className="space-y-2">
                <label className="block text-sm font-semibold text-vs-text-primary">
                  E. Renovation scope <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.renovation_scope}
                  onChange={(e) => setField("renovation_scope", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                >
                  <option value="">Select Scope</option>
                  {RENOVATION_SCOPES.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
                {errors.renovation_scope && (
                  <p className="text-xs text-red-500 font-medium">{errors.renovation_scope}</p>
                )}
              </div>
            </div>

            {/* F. Location (City, Locality, Address) */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-vs-text-primary">
                F. Property location
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="field-city" className="space-y-1">
                  <span className="text-xs font-medium text-vs-text-secondary">
                    City <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                  />
                  {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                </div>

                <div id="field-area_locality" className="space-y-1">
                  <span className="text-xs font-medium text-vs-text-secondary">
                    Locality / Neighborhood <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={form.area_locality}
                    onChange={(e) => setField("area_locality", e.target.value)}
                    placeholder="e.g. Indiranagar, Whitefield, Koramangala"
                    className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                  />
                  {errors.area_locality && (
                    <p className="text-xs text-red-500">{errors.area_locality}</p>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-vs-text-secondary">
                  Complete Address (Optional)
                </span>
                <input
                  type="text"
                  value={form.additional_address}
                  onChange={(e) => setField("additional_address", e.target.value)}
                  placeholder="Building name, flat number, street"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                />
              </div>
            </div>

            {/* G & H. Budget & Expected Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div id="field-budget_range" className="space-y-2">
                <label className="block text-sm font-semibold text-vs-text-primary">
                  G. Approximate budget <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.budget_range}
                  onChange={(e) => setField("budget_range", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                >
                  <option value="">Select Budget Range</option>
                  {BUDGET_RANGES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.budget_range && (
                  <p className="text-xs text-red-500 font-medium">{errors.budget_range}</p>
                )}
              </div>

              <div id="field-expected_start_date" className="space-y-2">
                <label className="block text-sm font-semibold text-vs-text-primary">
                  H. Expected start date <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.expected_start_date}
                  onChange={(e) => setField("expected_start_date", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                >
                  <option value="">Select Timeline</option>
                  {START_TIMELINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.expected_start_date && (
                  <p className="text-xs text-red-500 font-medium">{errors.expected_start_date}</p>
                )}
              </div>
            </div>

            {/* I. Customer Information & Phone */}
            <div className="space-y-4 pt-2 border-t border-vs-border">
              <label className="block text-sm font-semibold text-vs-text-primary">
                I. Customer information
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="field-customer_name" className="space-y-1">
                  <span className="text-xs font-medium text-vs-text-secondary">
                    Full Name <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setField("customer_name", e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                  />
                  {errors.customer_name && (
                    <p className="text-xs text-red-500">{errors.customer_name}</p>
                  )}
                </div>

                <div id="field-mobile" className="space-y-1">
                  <span className="text-xs font-medium text-vs-text-secondary">
                    Indian Mobile Number <span className="text-red-500">*</span>
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-vs-text-muted">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={form.mobile}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setField("mobile", digits);
                      }}
                      placeholder="10-digit mobile"
                      className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary font-mono"
                    />
                  </div>
                  {errors.mobile && <p className="text-xs text-red-500">{errors.mobile}</p>}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-vs-text-secondary">
                  Email Address (Optional)
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="name@example.com"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                />
              </div>
            </div>

            {/* Optional Fields: Photos, Floor Plan, Description */}
            <div className="space-y-4 pt-2 border-t border-vs-border">
              <label className="block text-sm font-semibold text-vs-text-primary">
                Optional: Upload Photos or Floor Plan
              </label>

              <div className="border-2 border-dashed border-vs-border rounded-xl p-6 text-center hover:border-vs-primary/40 transition-colors bg-vs-surface/40">
                <Upload className="w-8 h-8 text-vs-text-muted mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-medium text-vs-text-primary">
                  Click to upload property photographs or floor plan
                </p>
                <p className="text-[11px] text-vs-text-secondary mt-1">
                  Supported: JPG, JPEG, PNG, WebP, PDF (Up to 8 files, max 10MB each)
                </p>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="renovation-file-upload"
                />
                <label
                  htmlFor="renovation-file-upload"
                  className="mt-3 inline-block px-4 py-2 rounded-lg bg-vs-surface border border-vs-border text-xs font-medium text-vs-text-primary hover:bg-vs-bg cursor-pointer shadow-sm"
                >
                  Browse Files
                </label>
              </div>

              {/* Upload Previews */}
              {uploadedFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {uploadedFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl border border-vs-border bg-vs-surface p-2 flex flex-col items-center text-center overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white hover:bg-red-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt={item.name}
                          className="w-full h-20 object-cover rounded-lg mb-1"
                        />
                      ) : (
                        <FileText className="w-10 h-10 text-vs-text-muted my-2" />
                      )}
                      <p className="text-[11px] font-medium text-vs-text-primary truncate w-full">
                        {item.name}
                      </p>
                      <span className="text-[10px] text-vs-text-secondary">{item.size}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <span className="text-xs font-medium text-vs-text-secondary">
                  Short Description of Requirement (Optional)
                </span>
                <textarea
                  rows={3}
                  value={form.requirement_description}
                  onChange={(e) => setField("requirement_description", e.target.value)}
                  placeholder="Share any specific changes, materials preferred, or layout concerns..."
                  className="w-full mt-1 p-3 rounded-xl border border-vs-border bg-vs-surface text-vs-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-vs-primary"
                />
              </div>
            </div>

            {/* Note on Quotation Display */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-vs-text-secondary leading-relaxed">
              <strong className="text-vs-text-primary block mb-1">
                Note on Renovation Estimates:
              </strong>
              Final renovation estimates depend on property condition, measurements, material
              selection, labour, design requirements, and the scope of work. A detailed estimate
              can be shared after reviewing your requirements and, where necessary, conducting a site
              inspection.
            </div>

            {/* J. Consent Checkbox */}
            <div id="field-contact_consent" className="space-y-1 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.contact_consent}
                  onChange={(e) => setField("contact_consent", e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-vs-primary border-vs-border focus:ring-vs-primary"
                />
                <span className="text-xs sm:text-sm text-vs-text-primary font-medium">
                  I agree to be contacted by VisitSarva regarding my renovation enquiry.{" "}
                  <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.contact_consent && (
                <p className="text-xs text-red-500">{errors.contact_consent}</p>
              )}
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-xl bg-vs-primary text-white font-semibold text-base hover:opacity-95 shadow-md shadow-vs-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Your Enquiry...
                </>
              ) : (
                <>
                  Submit Renovation Enquiry
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* ── 12. WHY CHOOSE VISITSARVA ───────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[84rem] mx-auto px-4 sm:px-6 lg:px-12 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-xs font-mono font-bold tracking-widest text-vs-gold uppercase">
              THE VISITSARVA PROMISE
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-vs-text-primary">
              Why Plan Your Renovation with VisitSarva
            </h2>
            <p className="text-sm sm:text-base text-vs-text-secondary">
              A balanced approach focused on verified service professionals, transparent guidance,
              and coordinated property care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE_ITEMS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-vs-border bg-vs-surface hover:border-vs-gold/30 transition-all space-y-3 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-vs-text-primary">
                    {item.title}
                  </h3>
                  <p className="text-sm text-vs-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 13. HOW IT WORKS ───────────────────────────────────────────────── */}
      <section className="py-20 bg-vs-surface border-y border-vs-border">
        <div className="max-w-[84rem] mx-auto px-4 sm:px-6 lg:px-12 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-xs font-mono font-bold tracking-widest text-vs-gold uppercase">
              SIMPLE & STRUCTURED
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-vs-text-primary">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-vs-text-secondary">
              Four straightforward steps from initial enquiry to project review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((st) => (
              <div
                key={st.step}
                className="relative p-6 rounded-2xl bg-vs-bg border border-vs-border flex flex-col justify-between space-y-4"
              >
                <div>
                  <span className="font-mono text-3xl font-bold text-vs-gold/40 block mb-2">
                    {st.step}
                  </span>
                  <h3 className="font-display text-lg font-bold text-vs-text-primary">
                    {st.title}
                  </h3>
                  <p className="text-sm text-vs-text-secondary leading-relaxed mt-2">
                    {st.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 14. FAQ SECTION ─────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-mono font-bold tracking-widest text-vs-gold uppercase">
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-vs-text-primary">
              Got Questions About Renovation?
            </h2>
            <p className="text-sm sm:text-base text-vs-text-secondary">
              Everything you need to know about our services, estimates, feasibility, and site
              assessments.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-vs-border bg-vs-surface overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-vs-text-primary"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-vs-text-muted shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-vs-gold" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-sm text-vs-text-secondary leading-relaxed border-t border-vs-border/60">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 15. WHATSAPP AND CALL OPTIONS ───────────────────────────────────── */}
      <section className="py-16 bg-vs-surface border-t border-vs-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-vs-text-primary">
            Prefer Direct Discussion?
          </h2>
          <p className="text-sm sm:text-base text-vs-text-secondary max-w-xl mx-auto">
            Reach out directly to our verified team for quick clarifications or immediate property
            assistance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                "Hi VisitSarva, I would like to enquire about Renovation / Alteration Services for my property."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Us
            </a>

            <a
              href={`tel:${CALL_NUMBER.replace(/\s+/g, "")}`}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-vs-border bg-vs-bg hover:bg-vs-surface text-vs-text-primary font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4 text-vs-gold" />
              Call Us: {CALL_NUMBER}
            </a>
          </div>
        </div>
      </section>

      {/* ── 16. FOOTER ──────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
