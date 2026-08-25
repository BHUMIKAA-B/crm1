import React, { useEffect, useState } from "react";
import { Loader2, Save, Lock, User, Palette } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";
import { applyAccentColor } from "@/lib/theme";

const ACCENT_PRESETS = ["#78AFCF", "#0EA5E9", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#171717"];

export default function AdminSettings() {
  const [tab, setTab] = useState("profile");

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="font-display font-semibold text-vs-text-primary text-xl">Settings</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-vs-border">
        {[
          { id: "profile", label: "Admin Profile", icon: User },
          { id: "password", label: "Change Password", icon: Lock },
          { id: "site", label: "Website Settings", icon: Palette },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
              tab === id ? "border-vs-gold text-vs-gold font-medium" : "border-transparent text-vs-text-secondary hover:text-vs-text-primary"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "profile"  && <ProfileSettings />}
      {tab === "password" && <PasswordSettings />}
      {tab === "site"     && <SiteSettings />}
    </div>
  );
}

/* ── Profile ─────────────────────────────────────────────────────────────── */

function ProfileSettings() {
  const [form,    setForm]    = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get("/admin/profile")
      .then(({ data }) => setForm({ name: data.name || "", phone: data.phone || "" }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/profile", form);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-vs-gold" /></div>;

  return (
    <form onSubmit={save} className="card p-6 space-y-4">
      <h3 className="font-display font-semibold text-vs-text-primary flex items-center gap-2">
        <User size={16} className="text-vs-gold" /> Admin Profile
      </h3>
      <div>
        <label className="label">Display Name</label>
        <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      </div>
      <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Profile
      </button>
    </form>
  );
}

/* ── Password ────────────────────────────────────────────────────────────── */

function PasswordSettings() {
  const [form,   setForm]   = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (form.new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/change-password", {
        current_password: form.current_password,
        new_password:     form.new_password,
      });
      toast.success("Password changed successfully");
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not change password");
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={save} className="card p-6 space-y-4">
      <h3 className="font-display font-semibold text-vs-text-primary flex items-center gap-2">
        <Lock size={16} className="text-vs-gold" /> Change Password
      </h3>
      <div>
        <label className="label">Current Password</label>
        <input type="password" className="input-field" value={form.current_password} onChange={set("current_password")} required />
      </div>
      <div>
        <label className="label">New Password</label>
        <input type="password" className="input-field" value={form.new_password} onChange={set("new_password")} required />
        <p className="text-xs text-vs-text-secondary mt-1">Minimum 8 characters.</p>
      </div>
      <div>
        <label className="label">Confirm New Password</label>
        <input type="password" className="input-field" value={form.confirm} onChange={set("confirm")} required />
      </div>
      <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
        Change Password
      </button>
    </form>
  );
}

/* ── Site Settings ───────────────────────────────────────────────────────── */

function SiteSettings() {
  const [form,    setForm]    = useState({ accent_color: "#78AFCF", image_url: "", headline: "", sub_headline: "", cta_text: "", cta_link: "" });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get("/hero")
      .then(({ data }) => setForm(f => ({
        ...f,
        accent_color:  data.accent_color  || "#78AFCF",
        image_url:     data.image_url     || "",
        headline:      data.headline      || "",
        sub_headline:  data.sub_headline  || "",
        cta_text:      data.cta_text      || "",
        cta_link:      data.cta_link      || "",
      })))
      .finally(() => setLoading(false));
  }, []);

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const previewColor = (hex) => {
    setForm(f => ({ ...f, accent_color: hex }));
    applyAccentColor(hex);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/hero", form);
      applyAccentColor(form.accent_color);
      toast.success("Site settings saved");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-vs-gold" /></div>;

  return (
    <form onSubmit={save} className="space-y-4">
      {/* Accent color */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-vs-text-primary flex items-center gap-2 mb-1">
          <Palette size={16} className="text-vs-gold" /> Accent Color
        </h3>
        <p className="text-xs text-vs-text-secondary mb-4">Applied across buttons, links, and highlights site-wide.</p>
        <div className="flex items-center gap-3 flex-wrap">
          {ACCENT_PRESETS.map(hex => (
            <button type="button" key={hex} onClick={() => previewColor(hex)}
              className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                form.accent_color.toLowerCase() === hex.toLowerCase() ? "border-vs-text-primary scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: hex }}
              aria-label={hex}
            />
          ))}
          <label className="flex items-center gap-2 ml-1">
            <input type="color" value={form.accent_color} onChange={e => previewColor(e.target.value)}
              className="w-9 h-9 rounded-full border border-vs-border cursor-pointer bg-transparent" />
            <input type="text" value={form.accent_color} onChange={e => previewColor(e.target.value)}
              className="input-field !py-2 !w-28 !text-sm font-mono" />
          </label>
        </div>
      </div>

      {/* Hero */}
      <div className="card p-6 space-y-4">
        <h3 className="font-display font-semibold text-vs-text-primary mb-1">Hero Section</h3>
        <div>
          <label className="label">Background Image URL</label>
          <input className="input-field" placeholder="https://…" value={form.image_url} onChange={setF("image_url")} />
          {form.image_url && (
            <div className="mt-2 rounded-lg overflow-hidden border border-vs-border aspect-[16/7]">
              <img src={form.image_url} alt="Hero preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div>
          <label className="label">Headline</label>
          <input className="input-field" value={form.headline} onChange={setF("headline")} />
        </div>
        <div>
          <label className="label">Sub-headline</label>
          <textarea className="input-field min-h-[70px]" value={form.sub_headline} onChange={setF("sub_headline")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">CTA Text</label>
            <input className="input-field" value={form.cta_text} onChange={setF("cta_text")} />
          </div>
          <div>
            <label className="label">CTA Link</label>
            <input className="input-field" value={form.cta_link} onChange={setF("cta_link")} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
      </div>
    </form>
  );
}
