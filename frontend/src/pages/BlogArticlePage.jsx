import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CalendarDays, Clock3, Loader2, Share2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

export default function BlogArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/blogs/${slug}`)
      .then(({ data }) => {
        setArticle(data.article);
        setRelated(data.related || []);
        document.title = `${data.article.seo_title || data.article.title} | VisitSarva`;
      })
      .catch((err) => setError(err?.response?.status === 404 ? "Article not found." : "Could not load this article."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <PageState><Loader2 className="animate-spin text-vs-gold" /></PageState>;
  if (error || !article) return <PageState><h1 className="font-display text-2xl text-vs-text-primary">{error}</h1><Link to="/blogs" className="btn-primary mt-5">Back to articles</Link></PageState>;

  const url = window.location.href;
  const share = (network) => {
    const encoded = encodeURIComponent(url);
    const text = encodeURIComponent(article.title);
    const targets = {
      whatsapp: `https://wa.me/?text=${text}%20${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    };
    window.open(targets[network], "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
        <Link to="/blogs" className="inline-flex items-center gap-2 text-sm text-vs-text-muted hover:text-vs-gold"><ArrowLeft size={14} /> Knowledge Centre</Link>
        <div className="mt-8 text-[10px] uppercase tracking-[0.18em] text-vs-gold">{article.category}</div>
        <h1 className="mt-3 font-display text-4xl md:text-5xl leading-tight font-medium text-vs-text-primary">{article.title}</h1>
        <div className="mt-5 flex flex-wrap gap-4 text-sm text-vs-text-secondary">
          <span>By {article.author_name || "VisitSarva"}</span>
          <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {article.published_at ? new Date(article.published_at).toLocaleDateString() : ""}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={14} /> {article.reading_time || 1} min read</span>
        </div>
        {article.cover_image && <img src={article.cover_image} alt={article.title} className="mt-8 w-full aspect-[16/9] object-cover rounded-[1.5rem] border border-vs-border" />}
        <article className="prose prose-lg max-w-none mt-8 text-vs-text-secondary [&_h2]:text-vs-text-primary [&_h3]:text-vs-text-primary [&_p]:leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content }} />
        <div className="mt-10 rounded-2xl border border-vs-gold/30 bg-vs-gold/5 p-6">
          <h2 className="font-display text-xl text-vs-text-primary">Need help with a property?</h2>
          <p className="mt-2 text-sm text-vs-text-secondary">Speak with VisitSarva for property and document-service guidance.</p>
          <Link to="/services" className="btn-primary mt-5">Contact VisitSarva</Link>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-vs-border pt-6">
          <span className="flex items-center gap-2 text-sm text-vs-text-secondary"><Share2 size={16} /> Share</span>
          <button className="btn-secondary text-xs" onClick={() => share("whatsapp")}>WhatsApp</button>
          <button className="btn-secondary text-xs" onClick={() => share("facebook")}>Facebook</button>
          <button className="btn-secondary text-xs" onClick={() => share("linkedin")}>LinkedIn</button>
        </div>
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-vs-text-primary">Related articles</h2>
            <div className="mt-5 grid md:grid-cols-3 gap-4">
              {related.map((item) => (
                <Link key={item.id} to={`/blogs/${item.slug}`} className="rounded-2xl border border-vs-border bg-vs-surface p-4 hover:border-vs-gold transition-colors">
                  <div className="text-[10px] text-vs-gold uppercase">{item.category}</div>
                  <h3 className="mt-2 font-display text-lg text-vs-text-primary">{item.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function PageState({ children }) {
  return <div className="min-h-screen bg-vs-bg"><Navbar /><div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">{children}</div><Footer /></div>;
}
