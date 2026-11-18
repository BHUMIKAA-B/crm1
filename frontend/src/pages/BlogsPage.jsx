import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, Search, Loader2, Newspaper } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

export default function BlogsPage() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/blog-categories").then(({ data }) => setCategories(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/blogs", { params: { category: category || undefined, q: q || undefined, page, limit: 9 } })
      .then(({ data }) => {
        setArticles(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        setArticles([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [category, q, page]);

  const featured = articles.filter((article) => article.is_featured);

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <header className="border-b border-vs-border bg-vs-surface">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 py-14 md:py-18">
          <div className="flex items-center gap-3 text-vs-gold text-xs uppercase tracking-[0.22em]">
            <Newspaper size={16} /> VisitSarva Insights
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-medium text-vs-text-primary">
            Visit Sarva Knowledge Centre
          </h1>
          <p className="mt-4 max-w-2xl text-vs-text-secondary leading-relaxed">
            Learn about properties, documentation, legal processes and real estate opportunities.
          </p>
        </div>
      </header>

      <main className="max-w-[80rem] mx-auto px-6 lg:px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vs-text-muted" size={17} />
            <input
              value={q}
              onChange={(event) => { setQ(event.target.value); setPage(1); }}
              className="input-field pl-11"
              placeholder="Search articles, topics or descriptions"
            />
          </div>
          <select
            value={category}
            onChange={(event) => { setCategory(event.target.value); setPage(1); }}
            className="input-field lg:w-64"
          >
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
          </select>
        </div>

        {featured.length > 0 && page === 1 && !q && !category && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-medium text-vs-text-primary">Featured articles</h2>
            <div className="mt-5 grid md:grid-cols-3 gap-5">
              {featured.slice(0, 3).map((article) => <ArticleCard key={article.id} article={article} featured />)}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-medium text-vs-text-primary">Latest articles</h2>
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-vs-gold" /></div>
          ) : articles.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-vs-border bg-vs-surface p-10 text-center text-vs-text-secondary">
              No published articles found.
            </div>
          ) : (
            <div className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((article) => <ArticleCard key={article.id} article={article} />)}
            </div>
          )}
          {total > page * 9 && (
            <div className="mt-8 text-center">
              <button className="btn-primary" onClick={() => setPage((current) => current + 1)}>Load more</button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ArticleCard({ article, featured = false }) {
  return (
    <article className={`overflow-hidden rounded-[1.5rem] border bg-vs-surface transition-all duration-300 hover:-translate-y-1 ${featured ? "border-vs-gold/50" : "border-vs-border"}`}>
      {article.cover_image ? (
        <img src={article.cover_image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-vs-primary/20 via-vs-gold/10 to-vs-surface flex items-center justify-center">
          <Newspaper className="text-vs-gold" size={38} />
        </div>
      )}
      <div className="p-5">
        <div className="text-[10px] uppercase tracking-[0.16em] text-vs-gold">{article.category}</div>
        <h3 className="mt-2 font-display text-xl font-semibold text-vs-text-primary leading-snug">{article.title}</h3>
        {article.excerpt && <p className="mt-3 text-sm leading-relaxed text-vs-text-secondary line-clamp-3">{article.excerpt}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-vs-text-muted">
          <span className="flex items-center gap-1.5"><CalendarDays size={13} /> {article.published_at ? new Date(article.published_at).toLocaleDateString() : "Not published"}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={13} /> {article.reading_time || 1} min read</span>
        </div>
        <div className="mt-4 text-xs text-vs-text-secondary">By {article.author_name || "VisitSarva"}</div>
        <Link to={`/blogs/${article.slug}`} className="mt-5 inline-flex text-sm font-semibold text-vs-gold hover:underline">Read more →</Link>
      </div>
    </article>
  );
}
