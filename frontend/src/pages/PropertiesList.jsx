import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import AISearchBar from "@/components/AISearchBar";
import FilterPanel from "@/components/FilterPanel";
import api from "@/api/client";
import { PROPERTY_CATEGORIES } from "@/utils/format";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { fadeUp, stagger, viewportOnce } from "@/lib/animations";

const SORTS = [
  { v: "newest", l: "Newest" },
  { v: "price_asc", l: "Price: Low → High" },
  { v: "price_desc", l: "Price: High → Low" },
  { v: "popular", l: "Most viewed" },
];

const PropertiesList = () => {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [smartSummary, setSmartSummary] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(
    () => ({
      category: params.get("category") || "",
      city: params.get("city") || "",
      min_price: params.get("min_price") || "",
      max_price: params.get("max_price") || "",
      bedrooms: params.get("bedrooms") || "",
      sort_by: params.get("sort_by") || "newest",
      q: params.get("q") || "",
    }),
    [params]
  );

  /* Unused handleFilters removed; filters are updated directly via updateFilter */

  // Fetch data based on filters and params
  useEffect(() => {
    // smart search results
    if (params.get("smart") === "1") {
      const cached = sessionStorage.getItem("vs_smart_search");
      if (cached) {
        const parsed = JSON.parse(cached);
        setItems(parsed.results || []);
        setTotal(parsed.count || 0);
        setSmartSummary(parsed.summary);
        setLoading(false);
        return;
      }
    }
    setSmartSummary(null);
    setLoading(true);
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.city) q.city = filters.city;
    if (filters.min_price) q.min_price = filters.min_price;
    if (filters.max_price) q.max_price = filters.max_price;
    if (filters.bedrooms) q.bedrooms = filters.bedrooms;
    if (filters.sort_by) q.sort_by = filters.sort_by;
    if (filters.q) q.q = filters.q;
    api
      .get("/properties", { params: q })
      .then(({ data }) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [params, filters.category, filters.city, filters.min_price, filters.max_price, filters.bedrooms, filters.sort_by, filters.q]);

  const updateFilter = (k, v) => {
    const n = new URLSearchParams(params);
    n.delete("smart");
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };

  const clearAll = () => {
    setParams(new URLSearchParams(), { replace: true });
    sessionStorage.removeItem("vs_smart_search");
  };

  const activeFilterCount = [
    filters.category, filters.city, filters.min_price, filters.max_price, filters.bedrooms, filters.q
  ].filter(Boolean).length;

  const FiltersContent = () => (
    <>
      <FilterGroup label="Category">
        <select
          className="input-field"
          data-testid="filter-category"
          value={filters.category}
          onChange={(e) => updateFilter("category", e.target.value)}
        >
          <option value="">All</option>
          {PROPERTY_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} label={c.label} />
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="City">
        <input
          className="input-field"
          placeholder="e.g. Bangalore"
          value={filters.city}
          onChange={(e) => updateFilter("city", e.target.value)}
          data-testid="filter-city"
        />
      </FilterGroup>

      <FilterGroup label="Keyword">
        <input
          className="input-field"
          placeholder="e.g. sea view, gated"
          value={filters.q}
          onChange={(e) => updateFilter("q", e.target.value)}
          data-testid="filter-keyword"
        />
      </FilterGroup>

      <FilterGroup label="Min price (INR)">
        <input
          className="input-field"
          type="number"
          placeholder="0"
          value={filters.min_price}
          onChange={(e) => updateFilter("min_price", e.target.value)}
          data-testid="filter-min-price"
        />
      </FilterGroup>

      <FilterGroup label="Max price (INR)">
        <input
          className="input-field"
          type="number"
          placeholder="No limit"
          value={filters.max_price}
          onChange={(e) => updateFilter("max_price", e.target.value)}
          data-testid="filter-max-price"
        />
      </FilterGroup>

      <FilterGroup label="Bedrooms">
        <select
          className="input-field"
          value={filters.bedrooms}
          onChange={(e) => updateFilter("bedrooms", e.target.value)}
          data-testid="filter-bedrooms"
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n} label={`${n}+ BHK`} />
          ))}
        </select>
      </FilterGroup>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full text-sm text-vs-text-muted hover:text-red-500 transition-colors py-2 flex items-center justify-center gap-2"
        >
          <X size={13} /> Clear all filters
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <section className="bg-vs-bg border-b border-vs-border">
        <motion.div
          className="max-w-7xl mx-auto px-6 lg:px-8 py-8"
          initial="hidden"
          animate="visible"
          variants={stagger(0.1)}
        >
          <motion.h1 variants={fadeUp} className="font-display text-2xl md:text-3xl font-bold text-vs-text-primary">
            Browse Properties
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-1 text-sm text-vs-text-secondary">
            Every listing on VisitSarva is internally verified. Zero brokerage for buyers.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-5 max-w-3xl">
            <AISearchBar compact />
          </motion.div>
        </motion.div>
      </section>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-vs-surface border-r border-vs-border z-50 overflow-y-auto p-6 lg:hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-semibold text-vs-text-primary text-lg">Filters</h3>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-vs-bg text-vs-text-muted hover:text-vs-text-primary transition-colors"
                  aria-label="Close filters"
                >
                  <X size={18} />
                </button>
              </div>
              <FiltersContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 grid lg:grid-cols-12 gap-8">
        {/* ===== DESKTOP FILTERS ===== */}
        <aside className="hidden lg:block lg:col-span-3">
          <FiltersContent />
        </aside>

        {/* ===== RESULTS ===== */}
        <main className="col-span-12 lg:col-span-9">
          {smartSummary && (
            <div data-testid="smart-search-banner" className="mb-6 p-4 rounded-lg border border-vs-gold/30 bg-vs-gold/5">
              <div className="text-[11px] uppercase tracking-wider text-vs-gold mb-1">
                AI understood your query as
              </div>
              <div className="font-display text-vs-text-primary">{smartSummary}</div>
              <button onClick={clearAll} className="mt-2 text-xs text-vs-gold hover:underline">
                Browse all listings instead
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="text-sm text-vs-text-secondary" data-testid="results-count">
              <span className="font-semibold text-vs-text-primary">{loading ? "…" : total || items.length}</span>{" "}
              {(total || items.length) === 1 ? "result" : "results"}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden chip"
                onClick={() => setFiltersOpen(true)}
                data-testid="open-filters"
              >
                <SlidersHorizontal size={13} /> Filters
              </button>
              <select
                className="input-field !py-2 !text-sm !w-auto"
                value={filters.sort_by}
                onChange={(e) => updateFilter("sort_by", e.target.value)}
                data-testid="filter-sort"
              >
                {SORTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="animate-spin text-vs-gold" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-vs-text-secondary">
              No listings match these filters. Try clearing some filters.
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={stagger(0.08)}
            >
              {items.map((p) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <PropertyCard property={p} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};

const FilterGroup = ({ label, children }) => (
  <div className="mb-5">
    <label className="label">{label}</label>
    {children}
  </div>
);

export default PropertiesList;
