import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Landmark, ShieldCheck, Building2, CheckCircle2, ArrowRight,
  Loader as Loader2, Calculator, Sparkles, HelpCircle, PhoneCall,
  ChevronRight, BadgeCheck, FileText, UserCheck, Handshake
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EMICalculator from "@/components/EMICalculator";
import api from "@/api/client";
import { fadeUp, fadeIn, stagger } from "@/lib/animations";

const BANK_PARTNERS = [
  { name: "State Bank of India", code: "SBI", rate: "8.40% onwards", logoBg: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  { name: "HDFC Bank", code: "HDFC", rate: "8.50% onwards", logoBg: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { name: "ICICI Bank", code: "ICICI", rate: "8.55% onwards", logoBg: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { name: "Axis Bank", code: "AXIS", rate: "8.60% onwards", logoBg: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  { name: "Bank of Baroda", code: "BOB", rate: "8.40% onwards", logoBg: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { name: "Kotak Mahindra Bank", code: "KOTAK", rate: "8.70% onwards", logoBg: "bg-red-500/10 text-red-500 border-red-500/20" },
];

const FAQS = [
  {
    q: "Does VisitSarva charge any fee for loan assistance?",
    a: "No! VisitSarva provides 100% free loan assistance. We do not charge buyers any hidden fees or commissions."
  },
  {
    q: "Which banks and financial institutions do you partner with?",
    a: "We work with leading public and private sector banks in India, including SBI, HDFC, ICICI, Axis Bank, Bank of Baroda, Kotak, and registered NBFCs."
  },
  {
    q: "Can I apply for a loan for any property listed on VisitSarva?",
    a: "Yes! All verified properties on VisitSarva can be submitted for loan evaluation. Our financial team will guide you through pre-approval and legal check requirements."
  },
  {
    q: "What is the typical processing time for home loan assistance?",
    a: "Our team reaches out within 2 to 4 business hours after submission to initiate your document review and bank matching."
  }
];

export default function HomeLoanAssistance() {
  const [searchParams] = useSearchParams();
  const initialPropId = searchParams.get("property_id") || "";
  const initialPropName = searchParams.get("property_name") || "";

  const [propertiesList, setPropertiesList] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    property_id: initialPropId,
    property_name: initialPropName,
    preferred_location: "",
    property_value: "",
    loan_amount: "",
    employment_type: "Salaried",
    monthly_income_range: "₹50k - ₹1 Lakh",
    preferred_bank: "Any Top Bank",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  useEffect(() => {
    setLoadingProps(true);
    api.get("/properties")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        setPropertiesList(list);
        if (initialPropId && !initialPropName) {
          const matched = list.find((p) => p.id === initialPropId);
          if (matched) {
            setForm((s) => ({ ...s, property_name: matched.title }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProps(false));
  }, [initialPropId, initialPropName]);

  const setField = (key, val) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val };
      if (key === "property_id") {
        const selected = propertiesList.find((p) => p.id === val);
        if (selected) {
          updated.property_name = selected.title;
          const loc = selected.location || {};
          updated.preferred_location = [loc.city, loc.state].filter(Boolean).join(", ");
          if (selected.price) {
            updated.property_value = `₹${selected.price.toLocaleString("en-IN")}`;
          }
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.full_name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    const cleanPhone = form.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!form.email || !form.email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/loan-enquiries", form);
      toast.success("Loan enquiry submitted successfully!");
      setSubmittedResult(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-vs-bg text-vs-text-primary flex flex-col">
      <Navbar />

      {/* Hero Header Section */}
      <section className="relative pt-28 pb-16 overflow-hidden border-b border-vs-border bg-gradient-to-b from-vs-gold/5 via-transparent to-vs-bg">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger()} className="max-w-3xl space-y-6">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-vs-gold/10 border border-vs-gold/30 text-vs-gold text-xs font-semibold uppercase tracking-wider">
              <Landmark size={14} /> Property Financing & Home Loans
            </motion.div>
            <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-vs-text-primary leading-tight">
              Need a Home Loan for Your <span className="text-vs-gold">Dream Property?</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-vs-text-secondary leading-relaxed max-w-2xl">
              Find your property on VisitSarva and let our dedicated team assist you with fast, hassle-free bank loan financing at competitive interest rates.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-vs-text-secondary">
              <span className="flex items-center gap-1.5"><BadgeCheck size={16} className="text-vs-gold" /> Zero Processing Markup</span>
              <span className="flex items-center gap-1.5"><BadgeCheck size={16} className="text-vs-gold" /> Direct Team Guidance</span>
              <span className="flex items-center gap-1.5"><BadgeCheck size={16} className="text-vs-gold" /> Multiple Bank Offers</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Main Content: Form + Info Grid */}
      <section className="py-14 max-w-[80rem] mx-auto px-6 lg:px-12 w-full flex-1">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Form / Success State */}
          <div className="lg:col-span-7">
            <div className="card p-6 md:p-8 relative overflow-hidden shadow-premium-lg border-vs-border">
              {submittedResult ? (
                /* SUCCESS MESSAGE STATE */
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-semibold tracking-wider text-vs-gold uppercase">
                      Reference ID: {submittedResult.loan_enquiry_id}
                    </span>
                    <h2 className="font-display text-2xl md:text-3xl font-semibold text-vs-text-primary">
                      Thank you! Your loan assistance enquiry has been received.
                    </h2>
                    <p className="text-vs-text-secondary max-w-md mx-auto text-sm leading-relaxed">
                      VisitSarva's financing team will review your requirement and reach out to you within 2-4 hours to guide you on the next steps.
                    </p>
                  </div>

                  <div className="bg-vs-surface p-4 rounded-xl border border-vs-border text-left max-w-md mx-auto text-xs space-y-2 text-vs-text-secondary">
                    <div className="flex justify-between"><span>Applicant:</span> <strong className="text-vs-text-primary">{form.full_name}</strong></div>
                    <div className="flex justify-between"><span>Mobile:</span> <strong className="text-vs-text-primary">{form.phone}</strong></div>
                    {form.property_name && <div className="flex justify-between"><span>Property:</span> <strong className="text-vs-text-primary truncate max-w-[200px]">{form.property_name}</strong></div>}
                    {form.loan_amount && <div className="flex justify-between"><span>Loan Amount:</span> <strong className="text-vs-text-primary">{form.loan_amount}</strong></div>}
                  </div>

                  <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <Link to="/properties" className="btn-primary inline-flex items-center gap-2">
                      Explore Properties <ArrowRight size={14} />
                    </Link>
                    <button
                      onClick={() => {
                        setSubmittedResult(null);
                        setForm({
                          full_name: "", phone: "", email: "", property_id: "", property_name: "",
                          preferred_location: "", property_value: "", loan_amount: "", employment_type: "Salaried",
                          monthly_income_range: "₹50k - ₹1 Lakh", preferred_bank: "Any Top Bank", message: ""
                        });
                      }}
                      className="btn-secondary"
                    >
                      Submit Another Enquiry
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ENQUIRY FORM */
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-vs-text-primary">
                      Property Loan Assistance Request
                    </h2>
                    <p className="text-sm text-vs-text-secondary mt-1">
                      Fill out your details below. Our team will help you evaluate loan eligibility and connect with partner banks.
                    </p>
                  </div>

                  {/* Required Contact Info */}
                  <div className="space-y-4">
                    <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                      <UserCheck size={14} /> 1. Contact Information
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.full_name}
                          onChange={(e) => setField("full_name", e.target.value)}
                          placeholder="e.g. Rajesh Kumar"
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setField("phone", e.target.value)}
                          placeholder="10-digit phone number"
                          className="input-field"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="e.g. rajesh@example.com"
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Property Info */}
                  <div className="space-y-4 pt-4 border-t border-vs-border">
                    <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                      <Building2 size={14} /> 2. Property & Location
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                        Interested Property (Optional)
                      </label>
                      <select
                        value={form.property_id}
                        onChange={(e) => setField("property_id", e.target.value)}
                        className="input-field cursor-pointer"
                        disabled={loadingProps}
                      >
                        <option value="">-- General Loan Enquiry (No specific property selected) --</option>
                        {propertiesList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.location?.city || "India"}) - ₹{p.price?.toLocaleString("en-IN") || "N/A"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!form.property_id && (
                      <div>
                        <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                          Preferred Location / Area
                        </label>
                        <input
                          type="text"
                          value={form.preferred_location}
                          onChange={(e) => setField("preferred_location", e.target.value)}
                          placeholder="e.g. Whitefield, Bangalore or Gachibowli, Hyderabad"
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>

                  {/* Loan & Financial Info */}
                  <div className="space-y-4 pt-4 border-t border-vs-border">
                    <div className="text-xs uppercase tracking-wider text-vs-gold font-semibold flex items-center gap-1.5">
                      <Landmark size={14} /> 3. Loan Requirements
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                          Approx. Property Value
                        </label>
                        <input
                          type="text"
                          value={form.property_value}
                          onChange={(e) => setField("property_value", e.target.value)}
                          placeholder="e.g. ₹75,00,000"
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                          Expected Loan Amount
                        </label>
                        <input
                          type="text"
                          value={form.loan_amount}
                          onChange={(e) => setField("loan_amount", e.target.value)}
                          placeholder="e.g. ₹60,00,000"
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                          Employment Type
                        </label>
                        <select
                          value={form.employment_type}
                          onChange={(e) => setField("employment_type", e.target.value)}
                          className="input-field cursor-pointer"
                        >
                          <option value="Salaried">Salaried (Corporate / Govt)</option>
                          <option value="Self-employed">Self-Employed Professional</option>
                          <option value="Business">Business Owner</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                          Monthly Income Range
                        </label>
                        <select
                          value={form.monthly_income_range}
                          onChange={(e) => setField("monthly_income_range", e.target.value)}
                          className="input-field cursor-pointer"
                        >
                          <option value="< ₹50,000">Below ₹50,000 / month</option>
                          <option value="₹50k - ₹1 Lakh">₹50,000 - ₹1 Lakh / month</option>
                          <option value="₹1 Lakh - ₹2 Lakhs">₹1 Lakh - ₹2 Lakhs / month</option>
                          <option value="₹2 Lakhs+">₹2 Lakhs+ / month</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                        Preferred Bank (Optional)
                      </label>
                      <select
                        value={form.preferred_bank}
                        onChange={(e) => setField("preferred_bank", e.target.value)}
                        className="input-field cursor-pointer"
                      >
                        <option value="Any Top Bank">Any Top Partner Bank (Lowest Rates)</option>
                        <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="Bank of Baroda">Bank of Baroda</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-vs-text-secondary mb-1">
                        Additional Notes or Requirements
                      </label>
                      <textarea
                        rows={3}
                        value={form.message}
                        onChange={(e) => setField("message", e.target.value)}
                        placeholder="Mention any specific preferences, balance transfer requests, or timeline..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full justify-center text-base py-3.5 shadow-lg flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Submitting Enquiry...
                        </>
                      ) : (
                        <>
                          <Handshake size={18} />
                          Request Loan Assistance
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-vs-text-muted text-center mt-3">
                      🔒 Your contact information is kept strictly confidential. No spam, no card/banking credentials asked.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Benefits, Bank Partners & EMI Tool */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* How financing works */}
            <div className="card p-6 border-vs-border space-y-4">
              <h3 className="font-display text-xl font-semibold text-vs-text-primary flex items-center gap-2">
                <Sparkles size={20} className="text-vs-gold" /> Why Apply Through VisitSarva?
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-vs-gold/10 text-vs-gold flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h4 className="font-medium text-vs-text-primary">Property-Linked Verification</h4>
                    <p className="text-xs text-vs-text-secondary mt-0.5">Direct sync between shortlisted property legal status and bank valuation requirements.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-vs-gold/10 text-vs-gold flex items-center justify-center shrink-0 mt-0.5">
                    <Landmark size={18} />
                  </div>
                  <div>
                    <h4 className="font-medium text-vs-text-primary">Multiple Bank Comparisons</h4>
                    <p className="text-xs text-vs-text-secondary mt-0.5">Compare competitive interest rates across public & private Sector banks.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-vs-gold/10 text-vs-gold flex items-center justify-center shrink-0 mt-0.5">
                    <PhoneCall size={18} />
                  </div>
                  <div>
                    <h4 className="font-medium text-vs-text-primary">Dedicated CRM Follow-up</h4>
                    <p className="text-xs text-vs-text-secondary mt-0.5">Our in-house team guides you step-by-step from documentation to sanction.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Partner Showcase */}
            <div className="card p-6 border-vs-border">
              <h3 className="font-display text-lg font-semibold text-vs-text-primary mb-3 flex items-center justify-between">
                <span>Financing Partners</span>
                <span className="text-xs text-vs-gold font-normal">Top Rates</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {BANK_PARTNERS.map((b) => (
                  <div key={b.code} className="p-3 rounded-xl border border-vs-border bg-vs-surface flex flex-col justify-between">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded w-max border ${b.logoBg}`}>
                      {b.code}
                    </span>
                    <div className="mt-2">
                      <div className="text-xs font-medium text-vs-text-primary truncate">{b.name}</div>
                      <div className="text-[11px] text-vs-text-muted mt-0.5">{b.rate}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EMI Calculator Tool Component */}
            <div className="card p-6 border-vs-border">
              <h3 className="font-display text-lg font-semibold text-vs-text-primary mb-4 flex items-center gap-2">
                <Calculator size={18} className="text-vs-gold" /> Quick EMI Estimator
              </h3>
              <EMICalculator priceINR={7500000} />
            </div>

          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-14 bg-vs-surface border-t border-vs-border">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="eyebrow text-vs-gold mb-2">Clear & Honest</div>
            <h2 className="font-display text-3xl font-semibold text-vs-text-primary">Frequently Asked Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {FAQS.map((faq, i) => (
              <div key={i} className="card p-6 border-vs-border">
                <h4 className="font-display font-semibold text-vs-text-primary text-base flex items-start gap-2">
                  <HelpCircle size={18} className="text-vs-gold shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="text-sm text-vs-text-secondary mt-3 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
