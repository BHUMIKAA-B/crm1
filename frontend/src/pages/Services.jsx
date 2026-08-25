import React, { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Loader2, FileCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DocumentsDonutChart from "@/components/DocumentsDonutChart";
import api from "@/api/client";
import { SERVICE_TYPES } from "@/utils/format";
import { fadeUp, stagger, viewportOnce } from "@/lib/animations";

const Services = () => {
  const [form, setForm] = useState({
    request_type: "pre_registration",
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/services", form);
      toast.success("Request submitted. Our specialist team will reach out.");
      setForm({
        request_type: "pre_registration",
        name: "",
        email: "",
        phone: "",
        address: "",
        description: "",
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <section className="relative bg-gradient-to-b from-vs-gold/[0.06] via-white to-white border-b border-vs-border overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-vs-gold/10 blur-3xl" />
        <motion.div
          className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16"
          initial="hidden"
          animate="visible"
          variants={stagger(0.1)}
        >
          <motion.div variants={fadeUp} className="eyebrow mb-2">Property Services</motion.div>
          <motion.h1 variants={fadeUp} className="font-display text-3xl md:text-4xl font-bold text-vs-text-primary">
            All-in-One Documents.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-3 text-vs-text-secondary max-w-2xl">
            Khata, valuation, conversions, approvals — handled end-to-end by our specialist team.
          </motion.p>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <motion.div
            className="flex flex-col sm:flex-row items-center gap-8 p-6 md:p-8 card"
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={fadeUp}
          >
            <DocumentsDonutChart
              items={SERVICE_TYPES}
              selected={form.request_type}
              onSelect={(value) => setForm((f) => ({ ...f, request_type: value }))}
            />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-vs-text-muted mb-2">
                Interactive chart
              </p>
              <h3 className="font-display text-xl font-semibold text-vs-text-primary">
                {SERVICE_TYPES.find((s) => s.value === form.request_type)?.label}
              </h3>
              <p className="mt-2 text-sm text-vs-text-secondary leading-relaxed">
                Click a segment or card below to select a service. Hover for details — segments pop out with a glow effect.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={stagger(0.08)}
          >
            {SERVICE_TYPES.map((s) => (
              <motion.div
                key={s.value}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className={`card p-5 cursor-pointer transition-all duration-300 ${
                  form.request_type === s.value
                    ? "border-vs-primary ring-2 ring-vs-primary/20 shadow-md"
                    : "hover:border-vs-primary/40"
                }`}
                onClick={() => setForm((f) => ({ ...f, request_type: s.value }))}
                data-testid={`service-pick-${s.value}`}
              >
                <FileCheck size={18} className="text-vs-primary" />
                <h3 className="mt-3 font-display font-semibold text-vs-text-primary">
                  {s.label}
                </h3>
                <p className="mt-1.5 text-xs text-vs-text-secondary">
                  Specialist team · end-to-end paperwork
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.form
          onSubmit={submit}
          className="lg:col-span-5 card p-6 md:p-8 h-fit lg:sticky lg:top-24"
          data-testid="service-request-form"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
        >
          <h3 className="font-display text-xl font-semibold text-vs-text-primary">
            Request a service
          </h3>
          <p className="mt-1 text-sm text-vs-text-secondary">
            We'll review and call you within one business day.
          </p>
          <div className="mt-5 space-y-3">
            <div>
              <label className="label">Service type</label>
              <select className="input-field" value={form.request_type} onChange={set("request_type")} data-testid="service-type">
                {SERVICE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <input className="input-field" required placeholder="Your name" value={form.name} onChange={set("name")} data-testid="service-name" />
            <input className="input-field" type="email" required placeholder="Email" value={form.email} onChange={set("email")} data-testid="service-email" />
            <input className="input-field" required placeholder="Phone" value={form.phone} onChange={set("phone")} data-testid="service-phone" />
            <input className="input-field" placeholder="Property address (optional)" value={form.address} onChange={set("address")} />
            <textarea className="input-field min-h-[80px]" placeholder="Describe your requirement" value={form.description} onChange={set("description")} data-testid="service-description" />
          </div>
          <motion.button
            disabled={loading}
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="btn-primary w-full mt-5 justify-center"
            data-testid="service-submit"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Submit Request
          </motion.button>
        </motion.form>
      </section>
      <Footer />
    </div>
  );
};

export default Services;
