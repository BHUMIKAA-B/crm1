import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Bookmark, Inbox, ArrowRight, Loader2, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AISearchBar from "@/components/AISearchBar";
import PropertyCard from "@/components/PropertyCard";
import api from "@/api/client";
import { useAuthStore } from "@/store/authStore";

const BuyerHome = () => {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/properties/featured")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <section className="py-10 md:py-14 bg-vs-bg border-b border-vs-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-vs-text-primary" data-testid="buyer-greeting">
            Welcome back, {user?.name?.split(" ")[0] || "there"}.
          </h1>
          <p className="mt-1 text-vs-text-secondary">
            Tell us what you're looking for and our team will help.
          </p>
          <div className="mt-5 max-w-3xl">
            <AISearchBar compact />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/properties" className="chip">
              Browse all <ArrowRight size={12} />
            </Link>
            <Link to="/saved" className="chip">
              <Bookmark size={12} /> Saved
            </Link>
            <Link to="/enquiries" className="chip">
              <Inbox size={12} /> My Enquiries
            </Link>
            <Link to="/services" className="chip">
              Document Services
            </Link>
            <Link to="/chat" className="chip chip-active">
              <MessageCircle size={12} /> AI Assistant
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="eyebrow mb-1">Featured</div>
              <h2 className="font-display text-2xl font-semibold text-vs-text-primary">
                Recommended for you
              </h2>
            </div>
            <Link to="/properties" className="text-sm text-vs-gold hover:underline flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-vs-gold" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-vs-text-secondary">No properties yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default BuyerHome;
