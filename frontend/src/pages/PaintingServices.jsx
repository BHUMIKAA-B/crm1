import React, { useMemo, useState } from "react";
import { ArrowRight, BrushCleaning, Building2, Check, CheckCircle2, FileImage, Home, MapPin, Phone, Sparkles, Upload, User, X } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

const SERVICE_OPTIONS = [
  "Interior Wall Painting",
  "Exterior Painting",
  "Full Home Painting",
  "Repainting & Renovation",
  "Touch-Up & Maintenance",
  "Commercial Painting",
  "Other",
];

const PROPERTY_TYPES = ["Apartment", "Independent House", "Villa", "Office", "Commercial Space", "Other"];
const RESIDENTIAL_SIZE_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK", "Other"];
const PAINTING_REQUIREMENTS = ["New Painting", "Repainting", "Touch-Up"];

const FILE_LIMIT = 5;
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export default function PaintingServices() {
  const [selectedServices, setSelectedServices] = useState([]);
  const [form, setForm] = useState({
    customer_name: "",
    mobile: "",
    services_required: [],
    property_type: "",
    property_size: "",
    painting_requirements: [],
    city: "",
    area_locality: "",
    additional_address: "",
    expected_service_date: "",
    contact_consent: false,
  });
  const [uploads, setUploads] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const propertyIsCommercial = ["Office", "Commercial Space"].includes(form.property_type);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const next = prev.includes(service) ? prev.filter((item) => item !== service) : [...prev, service];
      setField("services_required", next);
      return next;
    });
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    const validFiles = [];

    files.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported image type. Use JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > FILE_SIZE_LIMIT) {
        toast.error(`${file.name} exceeds the 5MB size limit.`);
        return;
      }
      validFiles.push(file);
    });

    if (uploads.length + validFiles.length > FILE_LIMIT) {
      toast.error(`You can upload up to ${FILE_LIMIT} images.`);
      return;
    }

    const merged = [...uploads, ...validFiles];
    setUploads(merged);
    event.target.value = "";
  };

  const removeImage = (name) => {
    setUploads((prev) => prev.filter((file) => file.name !== name));
  };

  const validate = () => {
    const errors = {};
    const digits = form.mobile.replace(/\D/g, "").replace(/^91/, "");

    if (!form.customer_name.trim() || form.customer_name.trim().length < 2) {
      errors.customer_name = "Please enter your full name.";
    }
    if (digits.length !== 10) {
      errors.mobile = "Please enter a valid 10-digit Indian mobile number.";
    }
    if (!form.services_required || form.services_required.length === 0) {
      errors.services_required = "Please select at least one painting service.";
    }
    if (!form.property_type) {
      errors.property_type = "Please select your property type.";
    }
    if (!form.property_size) {
      errors.property_size = "Please select or enter your property size.";
    }
    if (!form.painting_requirements || form.painting_requirements.length === 0) {
      errors.painting_requirements = "Please select the painting requirement.";
    }
    if (!form.city.trim()) {
      errors.city = "Please enter your city.";
    }
    if (!form.area_locality.trim()) {
      errors.area_locality = "Please enter your area or locality.";
    }
    if (!form.expected_service_date) {
      errors.expected_service_date = "Please choose an expected service date.";
    }
    if (!form.contact_consent) {
      errors.contact_consent = "Please consent to be contacted by VisitSarva.";
    }

    return errors;
  };

  const toggleRequirement = (value) => {
    setForm((prev) => {
      const current = prev.painting_requirements || [];
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, painting_requirements: next };
    });
    setErrors((prev) => ({ ...prev, painting_requirements: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        mobile: form.mobile.replace(/\D/g, "").replace(/^91/, ""),
        services_required: form.services_required,
        painting_requirements: form.painting_requirements,
        property_size: String(form.property_size || "").trim(),
        uploaded_files: uploads.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      };

      const { data } = await api.post("/painting-enquiries", payload);
      setSubmitResult(data);
      toast.success("Painting enquiry submitted successfully.");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail) ? detail[0]?.msg || "Submission failed." : typeof detail === "string" ? detail : "Submission failed.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const filePreviewMap = useMemo(() => Object.fromEntries(uploads.map((file) => [file.name, URL.createObjectURL(file)])), [uploads]);

  if (submitResult) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text-primary">
        <Navbar />
        <main className="flex min-h-[60vh] items-center justify-center px-6 py-24">
          <div className="max-w-xl w-full bg-vs-surface border border-vs-border rounded-2xl p-8 shadow-premium-lg text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold tracking-[0.18em] text-vs-gold uppercase">Painting Enquiry</p>
            <h1 className="mt-4 font-display text-3xl font-semibold">Thank you for choosing Visit Sarva.</h1>
            <p className="mt-3 text-vs-text-secondary leading-relaxed">
              Your painting service enquiry has been received. Our team will contact you shortly.
            </p>
            <div className="mt-6 rounded-xl border border-vs-border bg-vs-bg px-4 py-3 text-sm text-vs-text-secondary">
              Enquiry ID: <span className="font-semibold text-vs-text-primary">{submitResult.painting_enquiry_id}</span>
            </div>
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(111,188,255,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(223,176,100,0.12),_transparent_30%)]" />
          <div className="relative mx-auto grid max-w-[80rem] gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-28">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-vs-bg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-vs-gold">
                <BrushCleaning className="h-3.5 w-3.5" /> Painting Services
              </span>
              <div className="space-y-4">
                <h1 className="font-display text-4xl font-semibold leading-tight text-vs-text-primary md:text-5xl">
                  Give Your Space a Fresh New Look
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-vs-text-secondary">
                  From fresh painting to complete home repainting, discover painting solutions tailored to your space and requirements with VisitSarva.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="#painting-form" className="btn-primary inline-flex items-center gap-2">
                  Get a Painting Estimate <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#painting-services" className="btn-secondary inline-flex items-center gap-2">
                  Explore Painting Services
                </a>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-vs-text-secondary">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Residential & commercial painting</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Quality finish & trusted teams</div>
              </div>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-[28px] border border-vs-border bg-vs-bg shadow-premium-lg">
                <img
                  src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&auto=format&fit=crop&q=80"
                  alt="Freshly painted interior wall"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="painting-services" className="mx-auto max-w-[80rem] px-6 py-20 lg:px-12">
          <div className="mb-10 text-center">
            <p className="eyebrow text-vs-gold mb-3">Painting Solutions for Every Space</p>
            <h2 className="font-display text-3xl font-semibold text-vs-text-primary md:text-4xl">Upgrade Your Home or Business with Confidence</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              { title: "Interior Wall Painting", image: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1000&auto=format&fit=crop&q=80", description: "Transform your interior walls with clean finishes, durable paints, and expert color guidance." },
              { title: "Exterior Painting", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80", description: "Protect and refresh your exterior with weather-resistant finishes built for long-term performance." },
              { title: "Full Home Painting", image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1000&auto=format&fit=crop&q=80", description: "A complete home transformation with consistent color palettes and premium workmanship." },
              { title: "Repainting & Renovation", image: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1000&auto=format&fit=crop&q=80", description: "Refresh worn-out surfaces and restore the beauty of older homes with thoughtful renovation support." },
              { title: "Touch-Up & Maintenance", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1000&auto=format&fit=crop&q=80", description: "Keep your property looking fresh with quick repairs, patch work, and finish touch-ups." },
              { title: "Commercial Painting", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&auto=format&fit=crop&q=80", description: "Professional painting for offices, retail outlets, and commercial premises that need a polished finish." },
            ].map((item) => {
              const active = selectedServices.includes(item.title);
              return (
                <article key={item.title} className="overflow-hidden rounded-2xl border border-vs-border bg-vs-surface shadow-premium-md transition hover:-translate-y-1">
                  <div className="h-52 w-full overflow-hidden">
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  </div>
                  <div className="space-y-4 p-5">
                    <h3 className="font-display text-2xl font-semibold text-vs-text-primary">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-vs-text-secondary">{item.description}</p>
                    <button
                      type="button"
                      onClick={() => {
                        toggleService(item.title);
                        document.getElementById("painting-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        active ? "bg-vs-gold text-white" : "bg-vs-primary text-white hover:bg-vs-primary-hover"
                      }`}
                    >
                      {active ? "Selected" : "Enquire Now"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="painting-form" className="border-y border-vs-border bg-vs-surface py-20">
          <div className="mx-auto max-w-[80rem] px-6 lg:px-12">
            <div className="mx-auto max-w-4xl">
              <div className="mb-10 text-center">
                <p className="eyebrow text-vs-gold mb-3">Free Consultation</p>
                <h2 className="font-display text-3xl font-semibold text-vs-text-primary md:text-4xl">Get Your Painting Estimate</h2>
                <p className="mt-3 text-vs-text-secondary">Tell us about your property and painting requirements. Our team will contact you to understand your needs and arrange the next steps.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-vs-border bg-vs-bg p-6 shadow-premium-lg md:p-8" noValidate>
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vs-gold">A. Painting Service Required</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SERVICE_OPTIONS.map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                          selectedServices.includes(service)
                            ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                            : "border-vs-border bg-vs-bg text-vs-text-secondary hover:border-vs-primary hover:text-vs-primary"
                        }`}
                      >
                        {selectedServices.includes(service) && <span className="mr-1">✓</span>}
                        {service}
                      </button>
                    ))}
                  </div>
                  {errors.services_required && <p className="text-xs text-red-500">{errors.services_required}</p>}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vs-gold">B. Property Type</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PROPERTY_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setField("property_type", type)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                            form.property_type === type ? "border-vs-gold bg-vs-gold/10 text-vs-gold" : "border-vs-border bg-vs-bg text-vs-text-secondary"
                          }`}
                        >
                          {form.property_type === type && <span className="mr-1">✓</span>}
                          {type}
                        </button>
                      ))}
                    </div>
                    {errors.property_type && <p className="text-xs text-red-500">{errors.property_type}</p>}
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vs-gold">C. Property Size</div>
                    {propertyIsCommercial ? (
                      <div>
                        <input
                          type="text"
                          value={form.property_size}
                          onChange={(e) => setField("property_size", e.target.value)}
                          placeholder="Approximate area, e.g. 2500 sq ft"
                          className="input-field"
                        />
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {RESIDENTIAL_SIZE_OPTIONS.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setField("property_size", size)}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                              form.property_size === size ? "border-vs-gold bg-vs-gold/10 text-vs-gold" : "border-vs-border bg-vs-bg text-vs-text-secondary"
                            }`}
                          >
                            {form.property_size === size && <span className="mr-1">✓</span>}
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.property_size && <p className="text-xs text-red-500">{errors.property_size}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-vs-gold">D. Painting Requirement</div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {PAINTING_REQUIREMENTS.map((req) => (
                      <button
                        key={req}
                        type="button"
                        onClick={() => toggleRequirement(req)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          (form.painting_requirements || []).includes(req)
                            ? "border-vs-gold bg-vs-gold/10 text-vs-gold"
                            : "border-vs-border bg-vs-bg text-vs-text-secondary hover:border-vs-primary hover:text-vs-primary"
                        }`}
                      >
                        {(form.painting_requirements || []).includes(req) && <span className="mr-1">✓</span>}
                        {req}
                      </button>
                    ))}
                  </div>
                  {errors.painting_requirements && <p className="text-xs text-red-500">{errors.painting_requirements}</p>}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="label">City <span className="text-red-500">*</span></label>
                    <input type="text" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="e.g. Bengaluru" className="input-field" />
                    {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="label">Area / Locality <span className="text-red-500">*</span></label>
                    <input type="text" value={form.area_locality} onChange={(e) => setField("area_locality", e.target.value)} placeholder="e.g. Whitefield" className="input-field" />
                    {errors.area_locality && <p className="mt-1 text-xs text-red-500">{errors.area_locality}</p>}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="label">Expected Service Date <span className="text-red-500">*</span></label>
                    <input type="date" value={form.expected_service_date} onChange={(e) => setField("expected_service_date", e.target.value)} className="input-field" />
                    {errors.expected_service_date && <p className="mt-1 text-xs text-red-500">{errors.expected_service_date}</p>}
                  </div>
                  <div>
                    <label className="label">Additional Address Details</label>
                    <input type="text" value={form.additional_address} onChange={(e) => setField("additional_address", e.target.value)} placeholder="Flat number, landmark, project name" className="input-field" />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="label">Customer Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.customer_name} onChange={(e) => setField("customer_name", e.target.value)} placeholder="Your full name" className="input-field" />
                    {errors.customer_name && <p className="mt-1 text-xs text-red-500">{errors.customer_name}</p>}
                  </div>

                  <div>
                    <label className="label">Mobile Number <span className="text-red-500">*</span></label>
                    <div className="flex items-center overflow-hidden rounded-xl border border-vs-border bg-vs-surface focus-within:border-vs-primary focus-within:ring-2 focus-within:ring-vs-primary/20">
                      <span className="border-r border-vs-border bg-vs-bg px-3 py-3.5 text-sm text-vs-text-secondary">+91</span>
                      <input type="tel" inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile number" className="flex-1 bg-transparent px-3 py-3.5 text-sm outline-none" />
                    </div>
                    {errors.mobile && <p className="mt-1 text-xs text-red-500">{errors.mobile}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-vs-gold">Property Photo Upload</label>
                  <div className="rounded-xl border border-dashed border-vs-border bg-vs-bg p-4">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-vs-border bg-vs-surface px-4 py-6 text-center text-vs-text-secondary hover:border-vs-primary hover:text-vs-primary">
                      <Upload className="mb-2 h-5 w-5" />
                      <span className="text-sm">Upload images showing wall condition, rooms, or exterior areas</span>
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} />
                    </label>
                  </div>
                  {uploads.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {uploads.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="relative overflow-hidden rounded-xl border border-vs-border bg-vs-surface">
                          {filePreviewMap[file.name] && <img src={filePreviewMap[file.name]} alt={file.name} className="h-28 w-full object-cover" />}
                          <div className="flex items-center justify-between gap-3 p-2">
                            <span className="truncate text-xs text-vs-text-primary">{file.name}</span>
                            <button type="button" onClick={() => removeImage(file.name)} className="text-vs-text-muted hover:text-red-500"><X className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" checked={form.contact_consent} onChange={(e) => setField("contact_consent", e.target.checked)} className="mt-1 h-4 w-4 rounded border-vs-border" />
                    <span>I agree to be contacted by VisitSarva regarding my painting service enquiry.</span>
                  </label>
                  {errors.contact_consent && <p className="text-xs text-red-500">{errors.contact_consent}</p>}
                </div>

                <div className="flex justify-center">
                  <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70">
                    {submitting ? "Submitting Enquiry..." : "Submit Painting Enquiry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
