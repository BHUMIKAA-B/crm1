import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2, Trash2, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import api from "@/api/client";
import { useWishlist } from "@/store/wishlistStore";

export default function WishlistPage() {
  const wishlist = useWishlist();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const load = async () => {
      try {
        if (wishlist.ids.length === 0) {
          if (mounted) setItems([]);
          return;
        }
        const token = localStorage.getItem("visitsarva-auth");
        let data;
        if (token) {
          try {
            data = (await api.get("/users/me/saved")).data;
          } catch {
            data = (await api.post("/properties/by-ids", { property_ids: wishlist.ids })).data;
          }
        } else {
          data = (await api.post("/properties/by-ids", { property_ids: wishlist.ids })).data;
        }
        if (mounted) setItems(data || []);
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [wishlist.ids]);

  const clearWishlist = async () => {
    if (!window.confirm("Clear every property from your wishlist?")) return;
    setClearing(true);
    await wishlist.clear();
    setItems([]);
    setClearing(false);
  };

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <main className="max-w-[80rem] mx-auto px-6 lg:px-12 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-vs-gold text-xs uppercase tracking-[0.18em]">
              <Heart size={15} /> Saved for later
            </div>
            <h1 className="mt-3 font-display text-4xl font-medium text-vs-text-primary">My Wishlist</h1>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              disabled={clearing}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} /> Clear wishlist
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-vs-gold" /></div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-[1.75rem] border border-vs-border bg-vs-surface px-6 py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-vs-gold/10 flex items-center justify-center text-vs-gold">
              <Heart size={28} />
            </div>
            <h2 className="mt-5 font-display text-2xl text-vs-text-primary">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-vs-text-secondary">Save properties you want to compare or revisit.</p>
            <Link to="/properties" className="btn-primary mt-6 inline-flex">Browse properties <ArrowRight size={15} /></Link>
          </div>
        ) : (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
