import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin, Bed, Bath, Maximize2, Compass, Sofa, BadgeCheck, ArrowLeft, Loader as Loader2, Phone, Mail, MessageSquare, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EMICalculator from "@/components/EMICalculator";
import api from "@/api/client";
import { INR, formatArea, CATEGORY_LABEL } from "@/utils/format";
import { fadeUp, fadeIn, stagger, viewportOnce } from "@/lib/animations";
import { CONSULTANT } from "@/config/consultant";
import { downloadBrochureForProperty, buildEmailUrl, buildWhatsAppUrl } from "@/utils/contactActions";

// Fix default Leaflet marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PropertyDetail = () => {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    api
      .get(`/properties/${id}`)
      .then(({ data }) => setP(data))
      .catch(() => toast.error("Could not load property"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-vs-gold" size={32} />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-vs-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <h2 className="font-display font-medium text-vs-text-primary text-2xl">Property not found</h2>
          <Link to="/properties" className="btn-primary mt-8">Browse all properties</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const images = p.images?.length
    ? p.images
    : [{ url: "https://images.pexels.com/photos/36676879/pexels-photo-36676879.jpeg?auto=compress&cs=tinysrgb&w=1600" }];
  const loc = p.location || {};
  const hasMap = loc.lat && loc.lng;
  const isForSale = p.category !== "rental";

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />

      <motion.div
        className="max-w-[80rem] mx-auto px-6 lg:px-12 py-6"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <Link
          to="/properties"
          className="inline-flex items-center gap-2 text-sm text-vs-text-muted hover:text-vs-gold transition-colors duration-300"
          data-testid="back-link"
        >
          <ArrowLeft size={14} /> Back to listings
        </Link>
      </motion.div>

      <motion.div
        className="max-w-[80rem] mx-auto px-6 lg:px-12 pb-16 grid lg:grid-cols-12 gap-8"
        initial="hidden"
        animate="visible"
        variants={stagger()}
      >

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* Gallery */}
          <motion.div variants={fadeUp}>
            <div className="relative overflow-hidden rounded-xl bg-vs-surface border border-vs-border">
              <motion.img
                key={activeImg}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                src={images[activeImg].url}
                alt={p.title}
                className="w-full aspect-[16/10] object-cover"
                data-testid="property-main-image"
              />
              <span className="absolute top-4 left-4 chip bg-vs-surface/95 backdrop-blur-sm border-vs-border text-vs-text-primary">
                {CATEGORY_LABEL[p.category]}
              </span>
              <span className="absolute top-4 right-4 chip bg-vs-gold text-vs-bg border-vs-gold">
                <BadgeCheck size={12} /> Verified by VisitSarva
              </span>
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      activeImg === i ? "border-vs-gold" : "border-vs-border hover:border-vs-gold/50"
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Title + price */}
          <motion.div variants={fadeUp}>
            <h1
              className="font-display font-medium text-vs-text-primary text-3xl md:text-4xl tracking-tight"
              data-testid="property-title"
            >
              {p.title}
            </h1>
            <div className="mt-3 flex items-center gap-2 text-vs-text-secondary text-sm">
              <MapPin size={14} className="text-vs-gold" />
              {[loc.address, loc.city, loc.state].filter(Boolean).join(", ")}
            </div>
            <div className="mt-5 flex items-baseline gap-4 flex-wrap">
              <div className="font-display text-3xl md:text-4xl font-medium text-vs-gold">
                {INR(p.price)}
                {!isForSale && (
                  <span className="text-base text-vs-text-muted font-normal"> /month</span>
                )}
              </div>
              {p.price_negotiable && (
                <span className="chip bg-vs-gold/10 border-vs-gold/30 text-vs-gold">Negotiable</span>
              )}
            </div>
          </motion.div>

          {/* Key stats */}
          <motion.div variants={stagger()} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KV icon={Maximize2} label="Area" value={formatArea(p.area)} />
            {p.bedrooms && <KV icon={Bed} label="Bedrooms" value={`${p.bedrooms} BHK`} />}
            {p.bathrooms && <KV icon={Bath} label="Bathrooms" value={p.bathrooms} />}
            {p.facing && <KV icon={Compass} label="Facing" value={p.facing} />}
            {p.furnishing && <KV icon={Sofa} label="Furnishing" value={p.furnishing} />}
          </motion.div>

          {/* Map */}
          {hasMap && (
            <motion.div
              variants={fadeUp}
              className="rounded-xl overflow-hidden border border-vs-border"
              style={{ height: 280 }}
            >
              <MapContainer
                center={[loc.lat, loc.lng]}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                />
                <Marker position={[loc.lat, loc.lng]}>
                  <Popup>{p.title}</Popup>
                </Marker>
              </MapContainer>
            </motion.div>
          )}

          {/* Description */}
          {p.description && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="About this property">
                <p className="text-vs-text-secondary leading-relaxed whitespace-pre-line">
                  {p.description}
                </p>
              </Section>
            </motion.div>
          )}

          {/* Amenities */}
          {p.amenities?.length > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="Amenities">
                <div className="flex flex-wrap gap-2">
                  {p.amenities.map((a) => (
                    <span key={a} className="chip">{a}</span>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Features */}
          {p.features?.length > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
              <Section title="Features">
                <div className="flex flex-wrap gap-2">
                  {p.features.map((f) => (
                    <span key={f} className="chip">{f}</span>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <motion.aside variants={fadeUp} className="lg:col-span-4">
          <div className="sticky top-24">
            <SidebarTabs key={p.id} propertyId={p.id} property={p} price={p.price} isForSale={isForSale} />
          </div>
        </motion.aside>
      </motion.div>

      <Footer />
    </div>
  );
};

/* Sidebar with Contact / EMI tabs */

const SidebarTabs = ({ propertyId, property, price, isForSale }) => {
  const [tab, setTab] = useState("contact");

  return (
    <div className="card overflow-hidden">
      {/* Tab bar */}
      {isForSale && price > 0 && (
        <div className="flex border-b border-vs-border">
          {[
            { id: "contact", label: "Contact" },
            { id: "emi", label: "EMI Calculator" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3.5 text-sm font-medium transition-all duration-300 ${
                tab === t.id
                  ? "text-vs-gold border-b-2 border-vs-gold bg-vs-surface/50"
                  : "text-vs-text-muted hover:text-vs-text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-5">
        {tab === "contact" && <EnquireCard propertyId={propertyId} property={property} />}
        {tab === "emi" && isForSale && price > 0 && (
          <EMICalculator priceINR={price} />
        )}
      </div>
    </div>
  );
};

/* Sub-components */

const Section = ({ title, children }) => (
  <div className="pt-6 border-t border-vs-border">
    <h3 className="font-display font-medium text-vs-text-primary text-xl mb-4">{title}</h3>
    {children}
  </div>
);

const KV = ({ icon: Icon, label, value }) => (
  <div className="card p-4">
    <Icon size={18} className="text-vs-gold" />
    <div className="mt-2 text-[10px] uppercase tracking-wider text-vs-text-muted">{label}</div>
    <div className="font-display font-medium text-vs-text-primary mt-1">{value}</div>
  </div>
);

const EnquireCard = ({ propertyId, property }) => {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", message: "", contact_preference: "call",
  });
  const [loading, setLoading] = useState(false);
  // Track whether this session already submitted an enquiry (for direct brochure download)
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  // When true, brochure downloads automatically after enquiry is submitted
  const [pendingBrochure, setPendingBrochure] = useState(false);
  const [brochureLoading, setBrochureLoading] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const triggerBrochureDownload = async (data) => {
    setBrochureLoading(true);
    try {
      await downloadBrochureForProperty({
        propertyId,
        property,
        name: data.name,
        phone: data.phone,
        email: data.email,
      });
      toast.success("Brochure downloaded!");
    } catch (err) {
      toast.error(err?.message || "Brochure is currently unavailable.");
    } finally {
      setBrochureLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/enquiries", { ...form, property_id: propertyId });
      toast.success("Enquiry sent! Our team will reach out shortly.");
      const savedData = { ...form };
      setSubmitted(true);
      setSubmittedData(savedData);
      if (pendingBrochure) {
        setPendingBrochure(false);
        await triggerBrochureDownload(savedData);
      }
      setForm({ name: "", email: "", phone: "", message: "", contact_preference: "call" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send enquiry");
    } finally {
      setLoading(false);
    }
  };

  const handleBrochureClick = async () => {
    if (submitted && submittedData) {
      // Already enquired — download immediately
      await triggerBrochureDownload(submittedData);
    } else {
      // Ask user to fill and submit the form first
      setPendingBrochure(true);
      toast("Fill and submit the enquiry form below to download the brochure.", { icon: "📄" });
    }
  };

  // Opens a URL by programmatically clicking an anchor appended to document.body.
  // This works reliably in all browsers and iframe contexts because:
  //  - it is triggered by a direct user gesture (no popup blocker)
  //  - the anchor lives outside the form (no form interference)
  const openUrl = (url, newTab = false) => {
    const a = document.createElement("a");
    a.href = url;
    if (newTab) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCallClick = () => {
    setForm((s) => ({ ...s, contact_preference: "call" }));
    setShowCallModal(true);
  };

  const handleEmailClick = () => {
    setForm((s) => ({ ...s, contact_preference: "email" }));
    openUrl(buildEmailUrl(property, form), false);
  };

  const handleWhatsAppClick = () => {
    setForm((s) => ({ ...s, contact_preference: "whatsapp" }));
    openUrl(buildWhatsAppUrl(property, form), true);
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h3 className="font-display font-medium text-vs-text-primary text-lg">
            Contact VisitSarva Team
          </h3>
          <p className="mt-1 text-sm text-vs-text-muted">
            Zero brokerage. We coordinate directly with the seller.
          </p>
        </div>
        <div className="space-y-3">
          <input
            className="input-field"
            required
            value={form.name}
            onChange={set("name")}
            placeholder="Your name"
            data-testid="enquiry-name"
          />
          <input
            className="input-field"
            type="email"
            required
            value={form.email}
            onChange={set("email")}
            placeholder="Email"
            data-testid="enquiry-email"
          />
          <input
            className="input-field"
            required
            value={form.phone}
            onChange={set("phone")}
            placeholder="Phone"
            data-testid="enquiry-phone"
          />
          <textarea
            className="input-field min-h-[80px]"
            value={form.message}
            onChange={set("message")}
            placeholder="A note (optional)"
            data-testid="enquiry-message"
          />
          <div>
            <label className="text-xs text-vs-text-muted uppercase tracking-wider mb-2 block">
              Preferred contact
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Call — button opens confirmation modal */}
              <button
                type="button"
                onClick={handleCallClick}
                data-testid="enquiry-pref-call"
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs transition-all duration-300 ${
                  form.contact_preference === "call"
                    ? "border-vs-gold text-vs-gold bg-vs-gold/10"
                    : "border-vs-border text-vs-text-muted hover:border-vs-gold/50"
                }`}
              >
                <Phone size={14} />
                Call
              </button>

              <button
                type="button"
                onClick={handleEmailClick}
                data-testid="enquiry-pref-email"
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs transition-all duration-300 ${
                  form.contact_preference === "email"
                    ? "border-vs-gold text-vs-gold bg-vs-gold/10"
                    : "border-vs-border text-vs-text-muted hover:border-vs-gold/50"
                }`}
              >
                <Mail size={14} />
                Email
              </button>

              <button
                type="button"
                onClick={handleWhatsAppClick}
                data-testid="enquiry-pref-whatsapp"
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs transition-all duration-300 ${
                  form.contact_preference === "whatsapp"
                    ? "border-vs-gold text-vs-gold bg-vs-gold/10"
                    : "border-vs-border text-vs-text-muted hover:border-vs-gold/50"
                }`}
              >
                <MessageSquare size={14} />
                WhatsApp
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
            data-testid="enquiry-submit"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Send Enquiry
          </button>
          <button
            type="button"
            onClick={handleBrochureClick}
            disabled={brochureLoading}
            className="btn-primary w-full justify-center flex items-center gap-2"
            data-testid="download-brochure"
          >
            {brochureLoading
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />}
            {brochureLoading
              ? "Downloading…"
              : pendingBrochure && !submitted
                ? "Submit form to download"
                : "Download Brochure"}
          </button>
          <ScheduleVisitButton propertyId={propertyId} />
        </div>
      </form>

      {showCallModal && (
        <CallModal onClose={() => setShowCallModal(false)} />
      )}
    </>
  );
};

/* Confirmation modal shown when user clicks the Call button */
const CallModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.5)" }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="bg-vs-surface border border-vs-border rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
      <h3 className="font-display font-medium text-vs-text-primary text-lg mb-4">
        Contact Property Consultant
      </h3>
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-vs-text-muted text-sm w-16">Name:</span>
          <span className="text-vs-text-primary font-medium">{CONSULTANT.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-vs-text-muted text-sm w-16">Phone:</span>
          <span className="text-vs-text-primary font-medium">{CONSULTANT.phone}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">
          Cancel
        </button>
        <a
          href={`tel:${CONSULTANT.phone}`}
          className="flex-1 btn-primary justify-center text-center flex items-center gap-2"
          onClick={onClose}
        >
          <Phone size={14} />
          Call Now
        </a>
      </div>
    </div>
  </div>
);

const ScheduleVisitButton = ({ propertyId }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/enquiries", {
        name: form.name,
        phone: form.phone,
        // email omitted — optional field; avoids 422 when not collected
        message: `Schedule a visit on ${form.date} at ${form.time}`,
        property_id: propertyId,
        contact_preference: "call",
      });
      toast.success("Visit scheduled! Our team will confirm shortly.");
      setOpen(false);
      setForm({ name: "", phone: "", date: "", time: "" });
    } catch {
      toast.error("Could not schedule visit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary w-full justify-center"
      >
        Schedule a Visit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-vs-surface border border-vs-border rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
            <h3 className="font-display font-medium text-vs-text-primary text-lg mb-4">Schedule a Site Visit</h3>
            <form onSubmit={submit} className="space-y-3">
              <input className="input-field" required placeholder="Your name" value={form.name} onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} />
              <input className="input-field" required placeholder="Phone number" value={form.phone} onChange={(e) => setForm(s => ({ ...s, phone: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-vs-text-muted uppercase tracking-wider mb-1 block">Preferred Date</label>
                  <input type="date" className="input-field" required min={new Date().toISOString().split("T")[0]} value={form.date} onChange={(e) => setForm(s => ({ ...s, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-vs-text-muted uppercase tracking-wider mb-1 block">Time</label>
                  <select className="input-field" value={form.time} onChange={(e) => setForm(s => ({ ...s, time: e.target.value }))} required>
                    <option value="">Select</option>
                    {["10:00 AM","11:00 AM","12:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 btn-secondary justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 btn-primary justify-center">
                  {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyDetail;
