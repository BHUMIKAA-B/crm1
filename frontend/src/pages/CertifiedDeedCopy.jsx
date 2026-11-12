import React, { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, MapPin, ShieldCheck, Upload, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

const DOCUMENT_TYPES = ["Sale Deed", "Gift Deed", "Partition Deed", "Other"];
const YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() - 1960 + 6 }, (_, index) => 1960 + index).reverse();
const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const normalizeMobile = (value) => {
  const digits = `${value || ""}`.replace(/\D/g, "");
  return digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
};

export default function CertifiedDeedCopy() {
  const [form, setForm] = useState({
    document_type: "",
    other_document_type: "",
    document_number: "",
    dont_know_document_number: false,
    registration_year: "",
    sro: "",
    property_location: "",
    property_city: "",
    property_address: "",
    customer_name: "",
    mobile: "",
    contact_consent: false,
  });
  const [uploads, setUploads] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = [];

    selectedFiles.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not supported. Use PDF, JPG, JPEG, PNG, or WebP.`);
        return;
      }
      validFiles.push(file);
    });

    const merged = [...uploads, ...validFiles].slice(0, 5);
    if (merged.length !== uploads.length + validFiles.length) {
      toast.error("You can upload up to 5 files.");
    }
    setUploads(merged);
    event.target.value = "";
  };

  const removeFile = (name) => {
    setUploads((prev) => prev.filter((file) => file.name !== name));
  };

  const validate = () => {
    const nextErrors = {};
    const digits = normalizeMobile(form.mobile);

    if (!form.document_type) {
      nextErrors.document_type = "Please select the document type.";
    }
    if (form.document_type === "Other" && !form.other_document_type.trim()) {
      nextErrors.other_document_type = "Please specify the document type.";
    }
    if (!form.dont_know_document_number && !form.document_number.trim()) {
      nextErrors.document_number = "Please enter the document number or select the checkbox.";
    }
    if (!form.registration_year) {
      nextErrors.registration_year = "Please select the registration year.";
    }
    if (!form.sro.trim()) {
      nextErrors.sro = "Please enter the Sub-Registrar Office.";
    }
    if (!form.property_location.trim()) {
      nextErrors.property_location = "Please enter the area or locality.";
    }
    if (!form.property_city.trim()) {
      nextErrors.property_city = "Please enter the city.";
    }
    if (!form.customer_name.trim() || form.customer_name.trim().length < 2) {
      nextErrors.customer_name = "Please enter your full name.";
    }
    if (digits.length !== 10) {
      nextErrors.mobile = "Please enter a valid 10-digit Indian mobile number.";
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
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        document_type: form.document_type === "Other" ? "Other" : form.document_type,
        document_number: form.dont_know_document_number ? "" : form.document_number.trim(),
        other_document_type: form.document_type === "Other" ? form.other_document_type.trim() : "",
        registration_year: Number(form.registration_year),
        mobile: normalizeMobile(form.mobile),
        property_location: form.property_location.trim(),
        property_city: form.property_city.trim(),
        property_address: form.property_address.trim(),
        customer_name: form.customer_name.trim(),
        uploaded_files: uploads.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      };

      const { data } = await api.post("/certified-deed-copy-enquiries", payload);
      setSubmitResult(data);
      toast.success("Your Certified Deed Copy request has been received successfully. Our team will contact you shortly.");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail[0]?.msg || "Submission failed."
        : typeof detail === "string"
          ? detail
          : "Submission failed.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const filePreview = useMemo(() => Object.fromEntries(uploads.map((file) => [file.name, file])), [uploads]);

  if (submitResult) {
    return (
      <div className="min-h-screen bg-vs-bg text-vs-text-primary">
        <Navbar />
        <main className="flex min-h-[65vh] items-center justify-center px-6 py-24">
          <div className="w-full max-w-xl rounded-2xl border border-vs-border bg-vs-surface p-8 text-center shadow-premium-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-vs-gold">Certified Deed Copy</p>
            <h1 className="mt-4 font-display text-3xl font-semibold text-vs-text-primary">Request received</h1>
            <p className="mt-3 text-base leading-relaxed text-vs-text-secondary">
              Your Certified Deed Copy request has been received successfully. Our team will contact you shortly.
            </p>
            <div className="mt-6 rounded-xl border border-vs-border bg-vs-bg px-4 py-3 text-sm text-vs-text-secondary">
              Enquiry ID: <span className="font-semibold text-vs-text-primary">{submitResult.certified_deed_copy_enquiry_id || submitResult.id}</span>
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
                <FileText className="h-3.5 w-3.5" /> Certified Deed Copy
              </span>
              <div>
                <h1 className="font-display text-4xl font-semibold leading-tight text-vs-text-primary md:text-5xl">
                  Get Your Certified Deed Copy
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-vs-text-secondary md:text-lg">
                  Need a certified copy of your registered property document? Submit your details and our team will assist you.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <a href="#enquiry-form" className="inline-flex items-center gap-2 rounded-full bg-vs-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-vs-primary/90">
                  Request Certified Copy <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-full border border-vs-border bg-vs-bg px-6 py-3 text-sm font-semibold text-vs-text-primary transition hover:border-vs-gold/60">
                  How It Works
                </a>
              </div>
              <div className="grid gap-4 pt-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-vs-border bg-vs-bg p-4">
                  <ShieldCheck className="mb-3 h-5 w-5 text-vs-gold" />
                  <p className="text-sm font-semibold text-vs-text-primary">Document review</p>
                </div>
                <div className="rounded-2xl border border-vs-border bg-vs-bg p-4">
                  <MapPin className="mb-3 h-5 w-5 text-vs-gold" />
                  <p className="text-sm font-semibold text-vs-text-primary">Location details</p>
                </div>
                <div className="rounded-2xl border border-vs-border bg-vs-bg p-4">
                  <UserRound className="mb-3 h-5 w-5 text-vs-gold" />
                  <p className="text-sm font-semibold text-vs-text-primary">Personal assistance</p>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="relative w-full overflow-hidden rounded-[2rem] border border-vs-border bg-vs-bg shadow-premium-xl">
                <img
                  src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&auto=format&fit=crop&q=80"
                  alt="Official property deed and document review"
                  className="h-[520px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d2d2a]/80 via-[#0d2d2a]/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Trusted property support</p>
                    <h2 className="mt-2 text-2xl font-semibold">Reliable assistance for your property document needs.</h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[80rem] px-6 py-16 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vs-gold">Service overview</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-vs-text-primary">Reliable Assistance for Your Property Documents</h2>
            <p className="mt-4 text-base leading-relaxed text-vs-text-secondary">
              Whether you need a certified copy for verification, personal records, legal documentation, or property-related transactions, VisitSarva helps you submit your request and understand the next steps.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="bg-vs-surface border-y border-vs-border">
          <div className="mx-auto max-w-[80rem] px-6 py-16 lg:px-12">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vs-gold">How it works</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-vs-text-primary">A simple request process</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {["Share your property details", "Submit the registration information", "Our team follows up with next steps"].map((step, index) => (
                <div key={step} className="rounded-2xl border border-vs-border bg-vs-bg p-6">
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-vs-surface text-sm font-semibold text-vs-gold">
                    {index + 1}
                  </span>
                  <p className="text-lg font-semibold text-vs-text-primary">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="enquiry-form" className="mx-auto max-w-[80rem] px-6 py-16 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[1.75rem] border border-vs-border bg-vs-surface p-7 shadow-premium-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vs-gold">Service request</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-vs-text-primary">Request Your Certified Deed Copy</h2>
              <p className="mt-3 text-sm leading-relaxed text-vs-text-secondary">
                Provide the available document and registration details. If you do not know your document number, you can still submit your enquiry.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-vs-border bg-vs-bg p-6 shadow-premium-sm md:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Document Type</label>
                  <select
                    value={form.document_type}
                    onChange={(event) => setField("document_type", event.target.value)}
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.document_type ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  >
                    <option value="">Select document type</option>
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.document_type && <p className="mt-2 text-sm text-red-500">{errors.document_type}</p>}
                </div>

                {form.document_type === "Other" && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-vs-text-primary">Specify Document Type</label>
                    <input
                      type="text"
                      value={form.other_document_type}
                      onChange={(event) => setField("other_document_type", event.target.value)}
                      placeholder="Enter document type"
                      className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.other_document_type ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                    />
                    {errors.other_document_type && <p className="mt-2 text-sm text-red-500">{errors.other_document_type}</p>}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Document Number</label>
                  <input
                    type="text"
                    value={form.document_number}
                    onChange={(event) => setField("document_number", event.target.value)}
                    disabled={form.dont_know_document_number}
                    placeholder="Enter document number"
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.document_number ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  />
                  {errors.document_number && <p className="mt-2 text-sm text-red-500">{errors.document_number}</p>}
                </div>

                <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-vs-border bg-vs-surface px-4 py-3">
                  <input
                    id="dont-know-document-number"
                    type="checkbox"
                    checked={form.dont_know_document_number}
                    onChange={(event) => {
                      setField("dont_know_document_number", event.target.checked);
                      if (event.target.checked) {
                        setField("document_number", "");
                      }
                    }}
                    className="h-4 w-4 accent-vs-gold"
                  />
                  <label htmlFor="dont-know-document-number" className="text-sm text-vs-text-primary">I don't know my document number.</label>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Registration Year</label>
                  <select
                    value={form.registration_year}
                    onChange={(event) => setField("registration_year", event.target.value)}
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.registration_year ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  >
                    <option value="">Select year</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  {errors.registration_year && <p className="mt-2 text-sm text-red-500">{errors.registration_year}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Sub-Registrar Office (SRO)</label>
                  <input
                    type="text"
                    value={form.sro}
                    onChange={(event) => setField("sro", event.target.value)}
                    placeholder="Enter SRO or office name"
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.sro ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  />
                  {errors.sro && <p className="mt-2 text-sm text-red-500">{errors.sro}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Area / Locality</label>
                  <input
                    type="text"
                    value={form.property_location}
                    onChange={(event) => setField("property_location", event.target.value)}
                    placeholder="Enter area or locality"
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.property_location ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  />
                  {errors.property_location && <p className="mt-2 text-sm text-red-500">{errors.property_location}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">City</label>
                  <input
                    type="text"
                    value={form.property_city}
                    onChange={(event) => setField("property_city", event.target.value)}
                    placeholder="Enter city"
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.property_city ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  />
                  {errors.property_city && <p className="mt-2 text-sm text-red-500">{errors.property_city}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Optional Address Details</label>
                  <textarea
                    value={form.property_address}
                    onChange={(event) => setField("property_address", event.target.value)}
                    rows={3}
                    placeholder="Enter complete address if available"
                    className="w-full rounded-xl border border-vs-border bg-vs-surface px-4 py-3 outline-none transition focus:border-vs-gold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Upload Document (Optional)</label>
                  <div className="rounded-xl border border-dashed border-vs-border bg-vs-surface p-4">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-vs-border bg-vs-bg px-4 py-3 text-sm font-medium text-vs-text-primary transition hover:border-vs-gold/60">
                      <Upload className="h-4 w-4" />
                      <span>Choose PDF, JPG, JPEG, PNG, or WebP</span>
                      <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="hidden" />
                    </label>
                    {uploads.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploads.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-xl border border-vs-border bg-vs-bg px-3 py-2 text-sm text-vs-text-secondary">
                            <span className="truncate">{file.name}</span>
                            <button type="button" onClick={() => removeFile(file.name)} className="ml-3 text-vs-gold hover:text-vs-gold/80" aria-label={`Remove ${file.name}`}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Customer Name</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(event) => setField("customer_name", event.target.value)}
                    placeholder="Enter your name"
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.customer_name ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  />
                  {errors.customer_name && <p className="mt-2 text-sm text-red-500">{errors.customer_name}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-vs-text-primary">Mobile Number</label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(event) => setField("mobile", event.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className={`w-full rounded-xl border bg-vs-surface px-4 py-3 outline-none transition ${errors.mobile ? "border-red-400" : "border-vs-border focus:border-vs-gold"}`}
                  />
                  {errors.mobile && <p className="mt-2 text-sm text-red-500">{errors.mobile}</p>}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-vs-border bg-vs-surface p-3">
                <input
                  id="contact-consent"
                  type="checkbox"
                  checked={form.contact_consent}
                  onChange={(event) => setField("contact_consent", event.target.checked)}
                  className="mt-1 h-4 w-4 accent-vs-gold"
                />
                <label htmlFor="contact-consent" className="text-sm leading-relaxed text-vs-text-secondary">
                  I agree to be contacted by VisitSarva regarding my Certified Deed Copy request.
                </label>
              </div>
              {errors.contact_consent && <p className="mt-2 text-sm text-red-500">{errors.contact_consent}</p>}

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-vs-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-vs-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Submitting..." : "Submit Enquiry"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
