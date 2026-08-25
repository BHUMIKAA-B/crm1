import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import api from "@/api/client";

const SavedProperties = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/users/me/saved")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl font-bold text-vs-text-primary" data-testid="saved-page-title">
          Saved Properties
        </h1>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-vs-gold" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 text-vs-text-secondary">
            You haven't saved anything yet.{" "}
            <Link to="/properties" className="text-vs-gold hover:underline">
              Browse properties
            </Link>
            .
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default SavedProperties;
