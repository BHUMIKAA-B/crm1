import React, { useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Search, Loader2, X, Star,
  ChevronDown, ChevronUp, Eye, Save, Send, FileDown, Upload, XCircle,
} from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const EMPTY = {
  // Basic
  title: "", description: "", about_builder: "",
  project_type: "", project_status: "new", construction_status: "",
  // Developer
  developer_name: "", developer_description: "",
  project_logo: "", project_banner: "", project_video: "",
  gallery_images: "",
  // Legal
  rera_number: "", approval_authority: "",
  // Category
  sector: "apartment", property_type: "", property_category: "",
  // Location
  address: "", city: "", state: "", country: "India",
  google_map_url: "", latitude: "", longitude: "",
  // Pricing
  starting_price: "", max_price: "", price_per_sqft: "", price_range: "",
  // Details
  configuration: "", available_units: "", area: "",
  possession_date: "", launch_date: "",
  // Features
  amenities: "", features: "", highlights: "",
  // Nearby
  nearby_schools: "", nearby_hospitals: "", nearby_metro: "",
  nearby_airport: "", nearby_it_parks: "", nearby_shopping_mall: "",
  // Documents
  master_plan: "", floor_plans: "", payment_plans: "",
  bank_approvals: "", legal_documents: "",
  // FAQs
  faqs: "",
  // SEO
  seo_title: "", seo_description: "", slug: "", meta_keywords: "",
  // Flags
  visibility_status: "active", is_featured: false, is_top_rated: false,
  is_recommended: false, is_active: true, status: "new",
  // Legacy
  location: "", builder: "", possession: "", rera_id: "", image_url: "",
};

const SECTIONS = [
  {
    id: "basic", label: "Basic Information",
    fields: [
      { key: "title", label: "Project Name *", span: 2 },
      { key: "developer_name", label: "Developer / Builder Name" },
      { key: "project_type", label: "Project Type", placeholder: "Residential, Commercial, Mixed…" },
      { key: "project_status", label: "Project Status", type: "select", options: ["new", "active", "completed", "upcoming"] },
      { key: "construction_status", label: "Construction Status", type: "select", options: ["", "Pre-Launch", "Under Construction", "Ready to Move", "Completed"] },
      { key: "sector", label: "Sector", type: "select", options: ["apartment", "commercial", "plot", "residential", "industrial", "agriculture", "rental"] },
      { key: "property_type", label: "Property Type", placeholder: "Flat, Villa, Plot…" },
      { key: "property_category", label: "Property Category", placeholder: "Luxury, Affordable, Mid-range…" },
      { key: "description", label: "Description", type: "textarea", span: 2 },
      { key: "about_builder", label: "About Builder", type: "textarea", span: 2 },
      { key: "highlights", label: "Highlights (one per line)", type: "textarea" },
      { key: "faqs", label: "FAQs (Q: …\\nA: …)", type: "textarea" },
    ],
  },
  {
    id: "media", label: "Media & Images",
    fields: [
      { key: "image_url", label: "Thumbnail Image URL", span: 2, placeholder: "https://…" },
      { key: "project_logo", label: "Project Logo URL", placeholder: "https://…" },
      { key: "project_banner", label: "Project Banner URL", placeholder: "https://…" },
      { key: "gallery_images", label: "Gallery Images (comma-separated URLs)", type: "textarea", span: 2, placeholder: "https://img1.jpg, https://img2.jpg" },
      { key: "project_video", label: "Project Video URL", span: 2, placeholder: "https://youtube.com/…" },
    ],
  },
  {
    id: "location", label: "Location",
    fields: [
      { key: "address", label: "Address", span: 2 },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "country", label: "Country" },
      { key: "google_map_url", label: "Google Map URL", span: 2 },
      { key: "latitude", label: "Latitude" },
      { key: "longitude", label: "Longitude" },
    ],
  },
  {
    id: "pricing", label: "Pricing",
    fields: [
      { key: "starting_price", label: "Starting Price", placeholder: "₹ 45,00,000" },
      { key: "max_price", label: "Maximum Price", placeholder: "₹ 3,00,00,000" },
      { key: "price_per_sqft", label: "Price Per Sq Ft", placeholder: "₹ 4,500" },
      { key: "price_range", label: "Display Price Range", placeholder: "₹ 45 L – 3 Cr" },
    ],
  },
  {
    id: "details", label: "Project Details",
    fields: [
      { key: "configuration", label: "Configuration", placeholder: "1BHK, 2BHK, 3BHK" },
      { key: "available_units", label: "Available Units", placeholder: "120" },
      { key: "area", label: "Area Range", placeholder: "850 – 2,400 sqft" },
      { key: "rera_number", label: "RERA Number" },
      { key: "rera_id", label: "RERA ID (alt)", placeholder: "Legacy field" },
      { key: "approval_authority", label: "Approval Authority" },
      { key: "possession_date", label: "Possession Date", placeholder: "Dec 2026" },
      { key: "launch_date", label: "Launch Date" },
      { key: "bank_approvals", label: "Bank Approvals", placeholder: "SBI, HDFC, ICICI…" },
    ],
  },
  {
    id: "amenities", label: "Amenities & Features",
    fields: [
      { key: "amenities", label: "Amenities (comma-separated)", type: "textarea", span: 2, placeholder: "Swimming Pool, Gym, Clubhouse, 24/7 Security…" },
      { key: "features", label: "Features (comma-separated)", type: "textarea", span: 2, placeholder: "Vaastu Compliant, Eco-friendly, Smart Home…" },
    ],
  },
  {
    id: "nearby", label: "Nearby Places",
    fields: [
      { key: "nearby_schools", label: "Nearby Schools" },
      { key: "nearby_hospitals", label: "Nearby Hospitals" },
      { key: "nearby_metro", label: "Nearby Metro" },
      { key: "nearby_airport", label: "Nearby Airport" },
      { key: "nearby_it_parks", label: "Nearby IT Parks" },
      { key: "nearby_shopping_mall", label: "Nearby Shopping Malls" },
    ],
  },
  {
    id: "documents", label: "Documents",
    fields: [
      { key: "master_plan", label: "Master Plan URL" },
      { key: "floor_plans", label: "Floor Plans URL" },
      { key: "payment_plans", label: "Payment Plans URL" },
      { key: "legal_documents", label: "Legal Documents URL" },
    ],
  },
  {
    id: "seo", label: "SEO & Visibility",
    fields: [
      { key: "seo_title", label: "SEO Title", span: 2 },
      { key: "seo_description", label: "SEO Description", type: "textarea", span: 2 },
      { key: "slug", label: "URL Slug", placeholder: "my-project-name" },
      { key: "meta_keywords", label: "Meta Keywords", placeholder: "real estate, apartments, Bangalore…" },
      { key: "visibility_status", label: "Visibility", type: "select", options: ["active", "inactive", "draft"] },
    ],
  },
];

export default function AdminProjects() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [openSections, setOpenSections] = useState({ basic: true });
  const [brochureUploading, setBrochureUploading] = useState(false);
  const brochureInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/projects").then(({ data }) => setItems(data || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.title?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.developer_name?.toLowerCase().includes(q) || p.builder?.toLowerCase().includes(q);
  });

  const openCreate = () => { setModal({ mode: "create", data: { ...EMPTY } }); setOpenSections({ basic: true }); };
  const openEdit   = (p) => { setModal({ mode: "edit", data: { ...p } });     setOpenSections({ basic: true }); };
  const closeModal = () => setModal(null);
  const toggleSection = (id) => setOpenSections((s) => ({ ...s, [id]: !s[id] }));

  const setField = (k) => (e) =>
    setModal((m) => ({ ...m, data: { ...m.data, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value } }));

  const save = async (publishStatus) => {
    const { mode, data } = modal;
    if (!data.title?.trim()) { toast.error("Project Name is required"); return; }
    setSaving(true);
    const payload = { ...data };
    if (publishStatus) payload.visibility_status = publishStatus;
    // derive legacy location field from city if not set
    if (!payload.location && payload.city) payload.location = payload.city;
    try {
      if (mode === "create") {
        await api.post("/admin/projects", payload);
        toast.success("Project created");
      } else {
        await api.put(`/admin/projects/${data.id}`, payload);
        toast.success("Project updated");
      }
      closeModal();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save project");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try { await api.delete(`/admin/projects/${p.id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Could not delete"); }
  };

  const toggleFeatured = async (p) => {
    try {
      await api.put(`/admin/projects/${p.id}`, { is_featured: !p.is_featured });
      load();
    } catch { toast.error("Could not update"); }
  };

  const handleBrochureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files are allowed"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File must be under 20 MB"); return; }
    const pid = modal?.data?.id;
    if (!pid) { toast.error("Save the project first before uploading a brochure"); return; }
    setBrochureUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(",")[1];
        await api.post(`/admin/projects/${pid}/brochure`, { data: base64, filename: file.name });
        toast.success("Brochure uploaded");
        setModal((m) => ({ ...m, data: { ...m.data, brochure_filename: file.name, brochure_data: base64, brochure_url: "" } }));
        setBrochureUploading(false);
      };
      reader.onerror = () => { toast.error("Could not read file"); setBrochureUploading(false); };
      reader.readAsDataURL(file);
    } catch { toast.error("Upload failed"); setBrochureUploading(false); }
    e.target.value = "";
  };

  const handleBrochureRemove = async () => {
    const pid = modal?.data?.id;
    if (!pid) { setModal((m) => ({ ...m, data: { ...m.data, brochure_filename: "", brochure_data: "", brochure_url: "" } })); return; }
    try {
      await api.delete(`/admin/projects/${pid}/brochure`);
      toast.success("Brochure removed");
      setModal((m) => ({ ...m, data: { ...m.data, brochure_filename: "", brochure_data: "", brochure_url: "" } }));
    } catch { toast.error("Could not remove brochure"); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display font-semibold text-vs-text-primary text-xl">
          Projects <span className="text-vs-text-secondary font-normal text-base">({filtered.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vs-text-secondary" />
            <input className="input-field !pl-8 !py-2 !text-sm w-56" placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={openCreate} className="btn-primary !py-2 !text-sm flex items-center gap-2">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-vs-bg">
            <tr>
              {["Image", "Title / Developer", "Sector", "City", "Status", "Possession", "Featured", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-vs-text-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="animate-spin text-vs-gold mx-auto" size={22} /></td></tr>}
            {!loading && filtered.map((p) => (
              <tr key={p.id} className="border-t border-vs-border hover:bg-vs-bg/50 transition-colors">
                <td className="px-4 py-3">
                  {p.image_url || p.project_banner
                    ? <img src={p.image_url || p.project_banner} alt="" className="w-16 h-11 object-cover rounded-lg" />
                    : <div className="w-16 h-11 bg-vs-bg rounded-lg" />}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-vs-text-primary truncate max-w-[180px]">{p.title}</div>
                  <div className="text-xs text-vs-text-secondary">{p.developer_name || p.builder}</div>
                </td>
                <td className="px-4 py-3"><span className="chip capitalize">{p.sector}</span></td>
                <td className="px-4 py-3 text-vs-text-secondary">{p.city}</td>
                <td className="px-4 py-3"><StatusBadge status={p.project_status || p.status} /></td>
                <td className="px-4 py-3 text-vs-text-secondary whitespace-nowrap">{p.possession_date || p.possession || "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleFeatured(p)} className="p-1 hover:bg-vs-bg rounded transition-colors">
                    <Star size={14} className={p.is_featured ? "text-vs-gold fill-vs-gold" : "text-vs-text-muted"} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-vs-bg text-vs-text-secondary hover:text-vs-gold transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => remove(p)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-vs-text-secondary hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !filtered.length && <tr><td colSpan={8} className="py-12 text-center text-vs-text-secondary">No projects found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="modal-panel w-full max-w-4xl max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-vs-border shrink-0">
              <h3 className="font-display font-semibold text-vs-text-primary text-lg">
                {modal.mode === "create" ? "New Project" : `Edit: ${modal.data.title || "Project"}`}
              </h3>
              <button onClick={closeModal} className="text-vs-text-secondary hover:text-vs-text-primary"><X size={18} /></button>
            </div>

            {/* Flags row */}
            <div className="px-6 py-3 bg-vs-bg border-b border-vs-border flex flex-wrap gap-6 shrink-0">
              {[
                { key: "is_featured",    label: "Featured Project" },
                { key: "is_top_rated",   label: "Top Rated" },
                { key: "is_recommended", label: "Recommended" },
                { key: "is_active",      label: "Active" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-vs-text-primary cursor-pointer">
                  <input type="checkbox" checked={!!modal.data[key]} onChange={setField(key)} className="w-4 h-4 accent-[var(--vs-gold)]" />
                  {label}
                </label>
              ))}
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {SECTIONS.map((sec) => (
                <div key={sec.id} className="border border-vs-border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-vs-bg hover:bg-vs-surface transition-colors text-sm font-semibold text-vs-text-primary"
                  >
                    {sec.label}
                    {openSections[sec.id] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  {openSections[sec.id] && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sec.fields.map((f) => (
                        <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : ""}>
                          <label className="label">{f.label}</label>
                          {f.type === "textarea" ? (
                            <textarea
                              className="input-field min-h-[80px]"
                              value={modal.data[f.key] || ""}
                              onChange={setField(f.key)}
                              placeholder={f.placeholder || ""}
                            />
                          ) : f.type === "select" ? (
                            <select className="input-field" value={modal.data[f.key] || ""} onChange={setField(f.key)}>
                              {f.options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                            </select>
                          ) : (
                            <input
                              className="input-field"
                              value={modal.data[f.key] || ""}
                              onChange={setField(f.key)}
                              placeholder={f.placeholder || ""}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Brochure Management */}
            <div className="px-6 py-4 border-t border-vs-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-vs-text-primary">
                  <FileDown size={14} className="text-vs-gold" /> Project Brochure (PDF)
                </div>
              </div>
              {modal.data.brochure_filename || modal.data.brochure_data || modal.data.brochure_url ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-vs-bg border border-vs-border">
                  <FileDown size={16} className="text-vs-gold shrink-0" />
                  <span className="text-sm text-vs-text-primary flex-1 truncate">
                    {modal.data.brochure_filename || "Brochure uploaded"}
                  </span>
                  <button
                    type="button"
                    onClick={() => brochureInputRef.current?.click()}
                    disabled={brochureUploading}
                    className="text-xs text-vs-text-secondary hover:text-vs-gold px-2 py-1 rounded border border-vs-border hover:border-vs-gold transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleBrochureRemove}
                    className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded border border-red-200 hover:border-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => brochureInputRef.current?.click()}
                  disabled={brochureUploading || modal.mode === "create"}
                  className="flex items-center gap-2 text-sm text-vs-text-secondary hover:text-vs-gold border border-dashed border-vs-border hover:border-vs-gold px-4 py-3 rounded-lg w-full justify-center transition-colors disabled:opacity-50"
                  title={modal.mode === "create" ? "Save the project first, then upload a brochure" : ""}
                >
                  {brochureUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {modal.mode === "create" ? "Save project first, then upload brochure" : "Upload Brochure PDF"}
                </button>
              )}
              <input
                ref={brochureInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleBrochureUpload}
              />
              {modal.mode === "edit" && (
                <div className="mt-2">
                  <label className="label text-[11px]">Or paste a brochure URL</label>
                  <input
                    className="input-field !text-xs"
                    placeholder="https://example.com/brochure.pdf"
                    value={modal.data.brochure_url || ""}
                    onChange={setField("brochure_url")}
                  />
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-vs-border shrink-0 flex-wrap">
              <button onClick={closeModal} className="btn-outline !py-2 !text-sm">Cancel</button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => save("draft")}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-vs-border text-sm text-vs-text-secondary hover:text-vs-gold hover:border-vs-gold transition-colors disabled:opacity-60"
                >
                  <Save size={13} /> Save Draft
                </button>
                <button
                  onClick={() => save(null)}
                  disabled={saving}
                  className="btn-primary !py-2 !text-sm flex items-center gap-2"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  <Send size={13} />
                  {modal.mode === "create" ? "Publish" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatusBadge = ({ status }) => {
  const cls = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
    completed: "bg-gray-100 text-gray-600 dark:bg-gray-800",
    upcoming: "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
    draft: "bg-purple-100 text-purple-700 dark:bg-purple-900/30",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls[status] || "bg-vs-bg text-vs-text-secondary"}`}>{status || "—"}</span>;
};
