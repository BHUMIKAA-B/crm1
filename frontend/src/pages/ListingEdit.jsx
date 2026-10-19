import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";
import MapPicker from "@/components/MapPicker";
import { PROPERTY_CATEGORIES } from "@/utils/format";

const AREA_UNITS = ["sqft", "sqm", "acre", "cent", "guntha"];

const ListingEdit = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get(`/seller/properties/${id}`)
      .then(({ data }) => {
        setForm({
          ...data,
          amenities_text: (data.amenities || []).join(", "),
          features_text: (data.features || []).join(", "),
          area: data.area || { size: "", unit: "sqft" },
          location: data.location || { address: "", city: "", state: "", pincode: "" },
        });
      })
      .catch(() => toast.error("Could not load listing"))
      .finally(() => setLoading(false));
  }, [id]);

  const setField = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const setLoc = (k) => (e) =>
    setForm((s) => ({ ...s, location: { ...s.location, [k]: e.target.value } }));
  const setArea = (k) => (e) =>
    setForm((s) => ({ ...s, area: { ...s.area, [k]: e.target.value } }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/seller/properties/${id}`, {
        title: form.title,
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
        amenities: form.amenities_text
          ? form.amenities_text.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        features: form.features_text
          ? form.features_text.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        location: form.location,
        area: { size: Number(form.area.size || 0), unit: form.area.unit },
      });
      toast.success("Updated! Sent back for verification.");
      navigate("/seller/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-vs-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate("/seller/dashboard")}
          className="inline-flex items-center gap-2 text-sm text-vs-text-secondary hover:text-vs-gold"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </button>
      </div>

      <form onSubmit={submit} className="max-w-4xl mx-auto px-6 lg:px-8 space-y-5 pb-16" data-testid="listing-edit-form">
        <div className="card p-6">
          <h1 className="font-display text-2xl font-bold text-vs-text-primary">Edit Listing</h1>
          <p className="mt-1 text-sm text-vs-text-secondary">Updates will resend the listing for VisitSarva team verification.</p>
        </div>

        <Block title="Basics">
          <Row><Field label="Title *"><input className="input-field" required value={form.title} onChange={setField("title")} data-testid="edit-title" /></Field></Row>
          <Row>
            <Field label="Category *">
              <select className="input-field" value={form.category} onChange={setField("category")}>
                {PROPERTY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sub-category"><input className="input-field" value={form.sub_category || ""} onChange={setField("sub_category")} /></Field>
          </Row>
          <Row><Field label="Description"><textarea className="input-field min-h-[110px]" value={form.description || ""} onChange={setField("description")} /></Field></Row>
        </Block>

        <Block title="Pricing & Area">
          <Row>
            <Field label="Price (INR) *"><input className="input-field" type="number" required value={form.price} onChange={setField("price")} /></Field>
            <Field label="Negotiable">
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={!!form.price_negotiable} onChange={(e) => setForm((s) => ({ ...s, price_negotiable: e.target.checked }))} />
                <span className="text-sm">Yes</span>
              </label>
            </Field>
          </Row>
          <Row>
            <Field label="Area *"><input className="input-field" type="number" required value={form.area.size} onChange={setArea("size")} /></Field>
            <Field label="Unit">
              <select className="input-field" value={form.area.unit} onChange={setArea("unit")}>
                {AREA_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </Row>
        </Block>

        <Block title="Configuration">
          <Row>
            <Field label="Bedrooms"><input className="input-field" type="number" value={form.bedrooms || ""} onChange={setField("bedrooms")} /></Field>
            <Field label="Bathrooms"><input className="input-field" type="number" value={form.bathrooms || ""} onChange={setField("bathrooms")} /></Field>
            <Field label="Floors"><input className="input-field" type="number" value={form.floors || ""} onChange={setField("floors")} /></Field>
          </Row>
          <Row>
            <Field label="Facing"><input className="input-field" value={form.facing || ""} onChange={setField("facing")} /></Field>
            <Field label="Furnishing">
              <select className="input-field" value={form.furnishing || ""} onChange={setField("furnishing")}>
                <option value="">—</option>
                <option>Unfurnished</option>
                <option>Semi-furnished</option>
                <option>Furnished</option>
              </select>
            </Field>
          </Row>
        </Block>

        <Block title="Location">
          <Row><Field label="Address"><input className="input-field" value={form.location.address} onChange={setLoc("address")} /></Field></Row>
          <Row>
            <Field label="City"><input className="input-field" value={form.location.city} onChange={setLoc("city")} /></Field>
            <Field label="State"><input className="input-field" value={form.location.state} onChange={setLoc("state")} /></Field>
            <Field label="Pincode"><input className="input-field" value={form.location.pincode} onChange={setLoc("pincode")} /></Field>
          </Row>
          <div>
            <label className="label">Drop a pin (click on the map)</label>
            <MapPicker
              lat={form.location.lat}
              lng={form.location.lng}
              onChange={(lat, lng) => setForm((s) => ({ ...s, location: { ...s.location, lat, lng } }))}
            />
          </div>
        </Block>

        <Block title="Amenities & Features">
          <Row><Field label="Amenities (comma separated)"><input className="input-field" value={form.amenities_text} onChange={setField("amenities_text")} /></Field></Row>
          <Row><Field label="Features (comma separated)"><input className="input-field" value={form.features_text} onChange={setField("features_text")} /></Field></Row>
        </Block>

        <div className="card p-6 flex items-center justify-end">
          <button type="submit" disabled={saving} className="btn-primary" data-testid="edit-submit">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={14} />}
            Save & Resend for Verification
          </button>
        </div>
      </form>
      <Footer />
    </div>
  );
};

const Block = ({ title, children }) => (
  <div className="card p-6">
    <h3 className="font-display font-semibold text-vs-text-primary mb-4">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);
const Row = ({ children }) => <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{children}</div>;
const Field = ({ label, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
  </div>
);

export default ListingEdit;
