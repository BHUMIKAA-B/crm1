import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Search, Loader as Loader2, X } from "lucide-react";
import api from "@/api/client";
import toast from "react-hot-toast";

const AISearchBar = ({ compact = false }) => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    // Empty query → show all listings
    if (!q.trim()) {
      sessionStorage.removeItem("vs_smart_search");
      navigate("/properties");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/ai/smart-search", { query: q });
      sessionStorage.setItem(
        "vs_smart_search",
        JSON.stringify({ query: q, ...data })
      );
      toast.success(data.summary || "Search ready");
      navigate("/properties?smart=1");
    } catch (err) {
      toast.error("AI search unavailable — showing filtered listings.");
      // Fallback: use query as a keyword search via URL param
      navigate(`/properties?q=${encodeURIComponent(q.trim())}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQ(val);
    // Debounce: clear any pending debounce on every keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const clearQuery = () => {
    setQ("");
    sessionStorage.removeItem("vs_smart_search");
  };

  return (
    <form
      onSubmit={onSubmit}
      data-testid="ai-search-form"
      className={`relative w-full ${
        compact ? "" : "shadow-luxury"
      } bg-vs-surface border border-vs-border rounded-xl overflow-hidden`}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <Sparkles className="text-vs-gold shrink-0" size={18} />
        <input
          data-testid="ai-search-input"
          value={q}
          onChange={handleChange}
          placeholder='Describe what you need — e.g. "2 BHK flat in Bangalore under 80 lakhs with parking"'
          className="flex-1 outline-none bg-transparent text-sm md:text-base text-vs-text-primary placeholder:text-vs-text-muted"
          aria-label="Property search"
        />
        {q && (
          <button
            type="button"
            onClick={clearQuery}
            className="text-vs-text-muted hover:text-vs-text-primary transition-colors shrink-0"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
        <button
          type="submit"
          data-testid="ai-search-submit"
          disabled={loading}
          className="btn-primary !py-2.5 !px-5 shrink-0"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          <span className="hidden sm:inline ml-2">{q.trim() ? "Search" : "Browse All"}</span>
        </button>
      </div>
      <div className="px-5 pb-3 text-[11px] text-vs-text-muted">
        Powered by AI · Natural language search in English or Hindi · Leave blank to browse all
      </div>
    </form>
  );
};

export default AISearchBar;
