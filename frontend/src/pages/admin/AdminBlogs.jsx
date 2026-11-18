import React, { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Eye } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const EMPTY = {
  title: "", slug: "", excerpt: "", content: "", category: "", author_name: "VisitSarva",
  cover_image: "", images: [], status: "draft", scheduled_at: "", is_featured: false,
  seo_title: "", meta_description: "",
};

export default function AdminBlogs() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [articleRes, categoryRes] = await Promise.all([api.get("/blogs/manage"), api.get("/blog-categories")]);
      setArticles(articleRes.data || []);
      setCategories(categoryRes.data || []);
    } catch {
      toast.error("Could not load blog management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title?.trim()) return toast.error("Title is required");
    try {
      if (editing.id) await api.put(`/blogs/${editing.id}`, editing);
      else await api.post("/blogs", editing);
      toast.success("Blog saved");
      setEditing(null);
      setPreview(false);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not save blog");
    }
  };

  const remove = async (article) => {
    if (!window.confirm(`Delete "${article.title}"?`)) return;
    await api.delete(`/blogs/${article.id}`);
    toast.success("Blog deleted");
    await load();
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post("/blog-images", form, { headers: { "Content-Type": "multipart/form-data" } });
      setEditing((current) => ({ ...current, cover_image: data.url }));
      toast.success("Cover image uploaded");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Image upload failed");
    }
  };

  const addCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      await api.post("/blog-categories", { name: categoryName.trim(), description: "" });
      setCategoryName("");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not add category");
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Remove category "${category.name}"?`)) return;
    await api.delete(`/blog-categories/${category.id}`);
    await load();
  };

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-vs-gold" /></div>;

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-vs-text-primary">{editing.id ? "Edit article" : "Create article"}</h1>
          <button className="text-sm text-vs-text-secondary" onClick={() => { setEditing(null); setPreview(false); }}>Back</button>
        </div>
        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <input className="input-field" placeholder="Article title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), seo_title: editing.seo_title || e.target.value })} />
            <input className="input-field" placeholder="URL slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            <textarea className="input-field min-h-20" placeholder="Short description" value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {[
                ["Heading", "<h2>Heading</h2>"], ["Paragraph", "<p>Paragraph</p>"],
                ["List", "<ul><li>Item</li></ul>"], ["Bold", "<strong>Bold text</strong>"],
                ["Link", "<a href=\"https://\" target=\"_blank\" rel=\"noopener noreferrer\">Link text</a>"],
              ].map(([label, html]) => (
                <button key={label} type="button" className="btn-secondary text-xs" onClick={() => setEditing({ ...editing, content: `${editing.content}${html}` })}>{label}</button>
              ))}
            </div>
            {preview ? (
              <div className="rounded-xl border border-vs-border bg-vs-surface p-6">
                <h2 className="font-display text-2xl text-vs-text-primary">{editing.title}</h2>
                <article className="prose mt-5 max-w-none text-vs-text-secondary" dangerouslySetInnerHTML={{ __html: editing.content }} />
              </div>
            ) : (
              <textarea className="input-field min-h-[300px] font-mono text-sm" placeholder="Article HTML content" value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
            )}
          </div>
          <aside className="space-y-4">
            <select className="input-field" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>
            <input className="input-field" placeholder="Author name" value={editing.author_name} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} />
            <input className="input-field" placeholder="Cover image URL" value={editing.cover_image} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} />
            <input type="file" accept="image/*" onChange={uploadImage} className="block w-full text-sm" />
            <select className="input-field" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Publish immediately</option>
              <option value="scheduled">Schedule publication</option>
            </select>
            {editing.status === "scheduled" && (
              <input type="datetime-local" className="input-field" value={editing.scheduled_at || ""} onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value })} />
            )}
            <label className="flex items-center gap-2 text-sm text-vs-text-secondary">
              <input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Featured / Recommended
            </label>
            <input className="input-field" placeholder="SEO title" value={editing.seo_title} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} />
            <textarea className="input-field min-h-20" placeholder="Meta description" value={editing.meta_description} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
            <button className="btn-secondary w-full" onClick={() => setPreview((current) => !current)}><Eye size={15} /> {preview ? "Edit content" : "Preview"}</button>
            <button className="btn-primary w-full" onClick={save}>Save article</button>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-vs-text-primary">Blog Management</h1>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> New article</button>
      </div>
      <div className="mt-6 rounded-xl border border-vs-border bg-vs-card p-4">
        <h2 className="text-sm font-semibold text-vs-text-primary">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category.id} className="inline-flex items-center gap-2 rounded-full border border-vs-border px-3 py-1.5 text-xs text-vs-text-secondary">
              {category.name}
              <button onClick={() => removeCategory(category)} aria-label={`Remove ${category.name}`}><Trash2 size={12} /></button>
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input className="input-field max-w-xs" placeholder="New category" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          <button className="btn-secondary" onClick={addCategory}>Add</button>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {articles.map((article) => (
          <div key={article.id} className="rounded-xl border border-vs-border bg-vs-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-vs-text-primary">{article.title}</h3>
              <p className="mt-1 text-xs text-vs-text-secondary">{article.category || "Uncategorised"} · {article.status}{article.status === "scheduled" ? ` · ${article.scheduled_at}` : ""}</p>
            </div>
            <div className="flex gap-2">
              {article.status === "published" && <LinkTo article={article} />}
              <button className="btn-secondary px-3" onClick={() => setEditing(article)}><Pencil size={14} /> Edit</button>
              <button className="btn-secondary px-3 text-red-600" onClick={() => remove(article)}><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        ))}
        {articles.length === 0 && <div className="rounded-xl border border-vs-border p-10 text-center text-vs-text-secondary">No articles yet.</div>}
      </div>
    </div>
  );
}

function LinkTo({ article }) {
  return <a className="btn-secondary px-3 inline-flex" href={`/blogs/${article.slug}`} target="_blank" rel="noreferrer"><Eye size={14} /> View</a>;
}
