import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Sparkles, Send, Loader2, ImagePlus, X as XIcon, ArrowLeft, ArrowRight,
  Check, CheckCircle2, Home, IndianRupee, Bed, MapPin, Sparkle, Camera, ClipboardCheck,
  Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MapPicker from "@/components/MapPicker";
import api from "@/api/client";
import { PROPERTY_CATEGORIES, INR, formatArea } from "@/utils/format";

const AREA_UNITS = ["sqft", "sqm", "acre", "cent", "guntha"];

const emptyForm = {
  title: "",
  description: "",
  category: "residential",
  sub_category: "",
  price: "",
  price_negotiable: false,
  bedrooms: "",
  bathrooms: "",
  floors: "",
  facing: "",
  furnishing: "",
  amenities_text: "",
  features_text: "",
  location: { address: "", city: "", state: "", pincode: "", lat: null, lng: null },
  area: { size: "", unit: "sqft" },
  images: [],
};

const STEPS = [
  { id: "category", title: "Category", Icon: Home },
  { id: "basics", title: "Basics", Icon: IndianRupee },
  { id: "config", title: "Configuration", Icon: Bed },
  { id: "location", title: "Location", Icon: MapPin },
  { id: "amenities", title: "Amenities", Icon: Sparkle },
  { id: "images", title: "Images", Icon: Camera },
  { id: "review", title: "Review", Icon: ClipboardCheck },
];

const NewListing = () => {
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm here to help you list your property. Tell me — what kind of property are you listing, where is it located, and what's the asking price? You can also describe area, bedrooms, amenities — anything you remember.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sessionIdRef = useRef("listing-" + Math.random().toString(36).slice(2));
  const chatBoxRef = useRef(null);
  const imageInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [history, chatLoading]);

  // ---- AI merge ----
  const mergeAi = (extracted) => {
    if (!extracted) return;
    setForm((prev) => {
      const next = { ...prev };
      const set = (key, val) => {
        if (val === undefined || val === null || val === "" || val === 0) return;
        next[key] = val;
      };
      set("title", extracted.title);
      set("description", extracted.description);
      set("category", extracted.category);
      set("sub_category", extracted.sub_category);
      set("price", extracted.price);
      if (typeof extracted.price_negotiable === "boolean") next.price_negotiable = extracted.price_negotiable;
      set("bedrooms", extracted.bedrooms);
      set("bathrooms", extracted.bathrooms);
      set("floors", extracted.floors);
      set("facing", extracted.facing);
      set("furnishing", extracted.furnishing);
      if (Array.isArray(extracted.amenities) && extracted.amenities.length) next.amenities_text = extracted.amenities.join(", ");
      if (Array.isArray(extracted.features) && extracted.features.length) next.features_text = extracted.features.join(", ");
      if (extracted.location && typeof extracted.location === "object") {
        next.location = { ...next.location };
        for (const k of ["address", "city", "state", "pincode"]) {
          if (extracted.location[k]) next.location[k] = extracted.location[k];
        }
      }
      if (extracted.area && typeof extracted.area === "object") {
        next.area = { ...next.area };
        if (extracted.area.size) next.area.size = extracted.area.size;
        if (extracted.area.unit) next.area.unit = extracted.area.unit;
      }
      return next;
    });
  };

  const sendChat = async (e) => {
    e?.preventDefault?.();
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput("");
    setHistory((h) => [...h, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const { data } = await api.post("/ai/listing-assistant", {
        session_id: sessionIdRef.current,
        message: msg,
        history: history.slice(-8),
      });
      setHistory((h) => [...h, { role: "assistant", content: data.reply || "Got it." }]);
      mergeAi(data.extracted);
    } catch (err) {
      setHistory((h) => [...h, { role: "assistant", content: "Sorry, I'm having trouble responding. You can still fill the form manually." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ---- field helpers ----
  const setField = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const setLoc = (k) => (e) => setForm((s) => ({ ...s, location: { ...s.location, [k]: e.target.value } }));
  const setArea = (k) => (e) => setForm((s) => ({ ...s, area: { ...s.area, [k]: e.target.value } }));
  const setPin = (lat, lng) => setForm((s) => ({ ...s, location: { ...s.location, lat, lng } }));

  const addImageFromFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((s) => ({ ...s, images: [...s.images, { url: reader.result }] }));
    reader.readAsDataURL(file);
  };
  const removeImage = (idx) => setForm((s) => ({ ...s, images: s.images.filter((_, i) => i !== idx) }));

  // ---- validation per step ----
  const validateStep = () => {
    const s = STEPS[step].id;
    if (s === "category" && !form.category) return "Pick a category";
    if (s === "basics") {
      if (!form.title.trim()) return "Add a title";
      if (!form.price) return "Add a price";
      if (!form.area.size) return "Add area size";
    }
    if (s === "location") {
      if (!form.location.city.trim()) return "Add city";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  // ---- submit ----
  const submit = async () => {
    if (!form.title || !form.price || !form.area.size) { toast.error("Title, price and area are required"); return; }
    setSubmitting(true);
    try {
      await api.post("/seller/properties", {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        sub_category: form.sub_category || null,
        price: Number(form.price),
        price_negotiable: !!form.price_negotiable,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        floors: form.floors ? Number(form.floors) : null,
        facing: form.facing || null,
        furnishing: form.furnishing || null,
        amenities: form.amenities_text ? form.amenities_text.split(",").map((s) => s.trim()).filter(Boolean) : [],
        features: form.features_text ? form.features_text.split(",").map((s) => s.trim()).filter(Boolean) : [],
        location: form.location,
        area: { size: Number(form.area.size), unit: form.area.unit },
        images: form.images,
      });
      toast.success("Listing submitted for verification!");
      navigate("/seller/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <button onClick={() => navigate("/seller/dashboard")} className="inline-flex items-center gap-2 text-sm text-vs-text-secondary hover:text-vs-gold">
          <ArrowLeft size={14} /> Back to dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-6 pb-16">
        {/* ===== AI CHATBOT ===== */}
        <aside className="lg:col-span-5 order-2 lg:order-1">
          <div className="card flex flex-col h-[78vh] sticky top-24">
            <div className="px-5 py-4 border-b border-vs-border flex items-center gap-2 bg-[#171717] text-white rounded-t-lg">
              <Sparkles size={18} className="text-[#A9CBE3]" />
              <div>
                <div className="font-display font-semibold text-sm">AI Listing Assistant</div>
                <div className="text-[10px] tracking-wider uppercase text-white/70">Auto-fills the wizard as you chat</div>
              </div>
            </div>
            <div ref={chatBoxRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3" data-testid="ai-chat-box">
              {history.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] text-sm ${m.role === "user" ? "ml-auto bg-vs-gold text-white" : "bg-vs-bg text-vs-text-primary border border-vs-border"} px-3.5 py-2.5 rounded-lg leading-relaxed whitespace-pre-line`}
                >
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <div className="text-sm text-vs-text-secondary flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Assistant is thinking…
                </div>
              )}
            </div>
            <form onSubmit={sendChat} className="border-t border-vs-border p-3 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Describe your property…"
                className="input-field !py-2 flex-1"
                data-testid="ai-chat-input"
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-primary !py-2 !px-3" data-testid="ai-chat-send">
                {chatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </div>
        </aside>

        {/* ===== WIZARD ===== */}
        <section className="lg:col-span-7 order-1 lg:order-2 space-y-5" data-testid="new-listing-wizard">
          {/* Step header / progress */}
          <div className="card p-6">
            <div className="eyebrow mb-2">New Listing · Step {step + 1} of {STEPS.length}</div>
            <h1 className="font-display text-2xl font-bold text-vs-text-primary">{STEPS[step].title}</h1>
            <Progress current={step} steps={STEPS} onJump={(i) => i <= step && setStep(i)} />
          </div>

          {/* Important notice — shown only on Step 1 (category) */}
          {STEPS[step].id === "category" && <SellerListingNotice />}

          {/* Step body */}
          <div className="card p-6 min-h-[300px]" data-testid={`step-${STEPS[step].id}`}>
            {STEPS[step].id === "category" && (
              <CategoryStep form={form} setForm={setForm} setField={setField} />
            )}
            {STEPS[step].id === "basics" && (
              <BasicsStep form={form} setField={setField} setArea={setArea} setForm={setForm} />
            )}
            {STEPS[step].id === "config" && (
              <ConfigStep form={form} setField={setField} />
            )}
            {STEPS[step].id === "location" && (
              <LocationStep form={form} setLoc={setLoc} setPin={setPin} />
            )}
            {STEPS[step].id === "amenities" && (
              <AmenitiesStep form={form} setField={setField} />
            )}
            {STEPS[step].id === "images" && (
              <ImagesStep
                form={form}
                imageInputRef={imageInputRef}
                addImageFromFile={addImageFromFile}
                removeImage={removeImage}
              />
            )}
            {STEPS[step].id === "review" && <ReviewStep form={form} />}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 0}
              data-testid="wizard-back"
              className="btn-outline disabled:opacity-40"
            >
              <ArrowLeft size={14} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} data-testid="wizard-next" className="btn-primary">
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={submit} disabled={submitting} data-testid="submit-listing" className="btn-primary">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Submit for Verification
              </button>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

// ===== Seller listing notice =====
const SellerListingNotice = () => (
  <div
    className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm px-5 py-4 flex gap-4"
    role="note"
    aria-label="Important notice for sellers"
    data-testid="seller-listing-notice"
  >
    <div className="shrink-0 mt-0.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
        <Info size={16} className="text-amber-600" />
      </span>
    </div>
    <div className="space-y-2">
      <h2 className="font-display font-semibold text-amber-800 text-sm tracking-wide">
        Important Notice
      </h2>
      <ul className="space-y-2 text-sm text-amber-900 leading-relaxed list-disc list-outside pl-4">
        <li>
          Commission will be charged upon successful sale of the property. The commission details
          will be communicated to you by our property expert.
        </li>
        <li>
          Ownership verification is mandatory. Our Field Manager will visit the property, and you
          will be required to provide valid ownership documents during the verification process.
        </li>
      </ul>
    </div>
  </div>
);

// ===== Progress dots =====
const Progress = ({ current, steps, onJump }) => (
  <div className="mt-5 flex items-center gap-1.5" data-testid="wizard-progress">
    {steps.map((s, i) => (
      <button
        key={s.id}
        onClick={() => onJump(i)}
        data-testid={`progress-step-${s.id}`}
        className={`flex items-center gap-1.5 flex-1 ${i <= current ? "cursor-pointer" : "cursor-not-allowed"}`}
        type="button"
      >
        <span
          className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
            i < current
              ? "bg-vs-gold text-white"
              : i === current
              ? "bg-vs-gold text-white ring-4 ring-vs-gold/15"
              : "bg-vs-bg text-vs-text-secondary border border-vs-border"
          }`}
        >
          {i < current ? <Check size={13} /> : i + 1}
        </span>
        {i < steps.length - 1 && (
          <span className={`flex-1 h-px ${i < current ? "bg-vs-gold" : "bg-[#E5E7EB]"}`} />
        )}
      </button>
    ))}
  </div>
);

// ===== Steps =====
const Block = ({ children }) => <div className="space-y-3">{children}</div>;
const Row = ({ children }) => <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{children}</div>;
const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className="label">{label}</label>
    {children}
  </div>
);

const CategoryStep = ({ form, setForm }) => (
  <Block>
    <p className="text-sm text-vs-text-secondary mb-3">Which category fits your property best?</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="category-picker">
      {PROPERTY_CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => setForm((s) => ({ ...s, category: c.value }))}
          data-testid={`cat-${c.value}`}
          className={`p-4 rounded-lg border text-left transition-all ${
            form.category === c.value
              ? "border-vs-gold bg-vs-gold/5 ring-2 ring-vs-gold/20"
              : "border-vs-border hover:border-vs-gold/50"
          }`}
        >
          <div className="font-display font-semibold text-vs-text-primary text-sm">{c.label}</div>
        </button>
      ))}
    </div>
    <div className="mt-5">
      <label className="label">Sub-category (optional)</label>
      <input
        className="input-field"
        value={form.sub_category}
        onChange={(e) => setForm((s) => ({ ...s, sub_category: e.target.value }))}
        placeholder="e.g. 3 BHK, Villa, Office, Plot"
        data-testid="listing-sub-category"
      />
    </div>
  </Block>
);

const BasicsStep = ({ form, setField, setArea, setForm }) => (
  <Block>
    <Field label="Title *">
      <input className="input-field" required value={form.title} onChange={setField("title")} placeholder="e.g. 3 BHK Garden Apartment — Whitefield" data-testid="listing-title" />
    </Field>
    <Field label="Description">
      <textarea className="input-field min-h-[110px]" value={form.description} onChange={setField("description")} placeholder="Tell buyers about the property…" data-testid="listing-description" />
    </Field>
    <Row>
      <Field label="Price (INR) *">
        <input className="input-field" type="number" required value={form.price} onChange={setField("price")} placeholder="e.g. 14500000" data-testid="listing-price" />
      </Field>
      <Field label="Negotiable">
        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={form.price_negotiable} onChange={(e) => setForm((s) => ({ ...s, price_negotiable: e.target.checked }))} />
          <span className="text-sm">Yes, open to negotiation</span>
        </label>
      </Field>
    </Row>
    <Row>
      <Field label="Area size *">
        <input className="input-field" type="number" required value={form.area.size} onChange={setArea("size")} placeholder="e.g. 1850" data-testid="listing-area-size" />
      </Field>
      <Field label="Unit">
        <select className="input-field" value={form.area.unit} onChange={setArea("unit")} data-testid="listing-area-unit">
          {AREA_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
    </Row>
  </Block>
);

const ConfigStep = ({ form, setField }) => (
  <Block>
    <Row>
      <Field label="Bedrooms"><input className="input-field" type="number" value={form.bedrooms} onChange={setField("bedrooms")} data-testid="listing-bedrooms" /></Field>
      <Field label="Bathrooms"><input className="input-field" type="number" value={form.bathrooms} onChange={setField("bathrooms")} /></Field>
      <Field label="Floors"><input className="input-field" type="number" value={form.floors} onChange={setField("floors")} /></Field>
    </Row>
    <Row>
      <Field label="Facing"><input className="input-field" value={form.facing} onChange={setField("facing")} placeholder="e.g. East" /></Field>
      <Field label="Furnishing">
        <select className="input-field" value={form.furnishing} onChange={setField("furnishing")}>
          <option value="">—</option>
          <option>Unfurnished</option>
          <option>Semi-furnished</option>
          <option>Furnished</option>
        </select>
      </Field>
    </Row>
  </Block>
);

const LocationStep = ({ form, setLoc, setPin }) => (
  <Block>
    <Field label="Address"><input className="input-field" value={form.location.address} onChange={setLoc("address")} data-testid="listing-address" /></Field>
    <Row>
      <Field label="City *"><input className="input-field" required value={form.location.city} onChange={setLoc("city")} data-testid="listing-city" /></Field>
      <Field label="State"><input className="input-field" value={form.location.state} onChange={setLoc("state")} /></Field>
      <Field label="Pincode"><input className="input-field" value={form.location.pincode} onChange={setLoc("pincode")} /></Field>
    </Row>
    <div className="mt-4">
      <label className="label">Drop a pin (click on the map)</label>
      <MapPicker lat={form.location.lat} lng={form.location.lng} onChange={setPin} />
    </div>
  </Block>
);

const AmenitiesStep = ({ form, setField }) => (
  <Block>
    <Field label="Amenities (comma separated)">
      <input className="input-field" value={form.amenities_text} onChange={setField("amenities_text")} placeholder="Swimming Pool, Gym, Lift, Power Backup" data-testid="listing-amenities" />
    </Field>
    <Field label="Features (comma separated)">
      <input className="input-field" value={form.features_text} onChange={setField("features_text")} placeholder="RERA Approved, Park Facing, Vaastu Compliant" />
    </Field>
    <p className="text-xs text-vs-text-secondary mt-2">
      Separate each item with a comma. Buyers filter by these tags.
    </p>
  </Block>
);

const ImagesStep = ({ form, imageInputRef, addImageFromFile, removeImage }) => (
  <Block>
    <p className="text-sm text-vs-text-secondary">Add up to 20 photos. JPG/PNG/WebP, max 5MB each.</p>
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
      {form.images.map((img, i) => (
        <div key={i} className="relative aspect-[4/3] rounded overflow-hidden border border-vs-border">
          <img src={img.url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => removeImage(i)}
            className="absolute top-1.5 right-1.5 bg-black/70 text-white rounded-full p-1"
            aria-label="Remove image"
          >
            <XIcon size={12} />
          </button>
        </div>
      ))}
      {form.images.length < 20 && (
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          data-testid="add-image-btn"
          className="aspect-[4/3] border-2 border-dashed border-vs-border hover:border-vs-gold rounded flex flex-col items-center justify-center gap-1 text-vs-text-secondary hover:text-vs-gold"
        >
          <ImagePlus size={20} />
          <span className="text-xs">Add image</span>
        </button>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) addImageFromFile(f);
          e.target.value = "";
        }}
      />
    </div>
  </Block>
);

const ReviewStep = ({ form }) => {
  const cat = PROPERTY_CATEGORIES.find((c) => c.value === form.category);
  return (
    <Block>
      <p className="text-sm text-vs-text-secondary">Review and submit. Our team will publish within 48 hours.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Tile label="Title" v={form.title} />
        <Tile label="Category" v={cat?.label} />
        <Tile label="Price" v={INR(form.price)} />
        <Tile label="Area" v={formatArea(form.area)} />
        <Tile label="Bedrooms" v={form.bedrooms || "—"} />
        <Tile label="Bathrooms" v={form.bathrooms || "—"} />
        <Tile label="City" v={form.location.city || "—"} />
        <Tile label="Pin" v={form.location.lat ? `${form.location.lat.toFixed(4)}, ${form.location.lng.toFixed(4)}` : "Not set"} />
        <Tile label="Furnishing" v={form.furnishing || "—"} />
        <Tile label="Images" v={`${form.images.length} added`} />
      </div>
      {form.description && (
        <div className="mt-3 p-4 bg-vs-bg rounded border border-vs-border">
          <div className="text-[10px] uppercase tracking-wider text-vs-text-secondary mb-1">Description</div>
          <p className="text-sm text-vs-text-primary whitespace-pre-line">{form.description}</p>
        </div>
      )}
      {form.amenities_text && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-vs-text-secondary mb-1">Amenities</div>
          <div className="flex flex-wrap gap-1.5">
            {form.amenities_text.split(",").map((a) => a.trim()).filter(Boolean).map((a) => (
              <span key={a} className="chip">{a}</span>
            ))}
          </div>
        </div>
      )}
    </Block>
  );
};

const Tile = ({ label, v }) => (
  <div className="p-3 rounded border border-vs-border">
    <div className="text-[10px] uppercase tracking-wider text-vs-text-secondary">{label}</div>
    <div className="font-display font-semibold text-vs-text-primary text-sm mt-0.5">{v || "—"}</div>
  </div>
);

export default NewListing;
