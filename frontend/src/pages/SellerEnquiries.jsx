import React, { useEffect, useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

const SellerEnquiries = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/seller/enquiries")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl font-bold text-vs-text-primary">
          Enquiries on your listings
        </h1>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-vs-gold" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 text-vs-text-secondary">No enquiries yet.</div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((e) => (
              <div key={e.id} className="card p-5" data-testid={`seller-enquiry-${e.id}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-display font-semibold text-vs-text-primary">
                    {e.property_title}
                  </div>
                  <span className="text-xs text-vs-text-secondary">
                    {new Date(e.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-3 text-sm text-vs-text-primary">
                  <strong>{e.name}</strong> — {e.message || "(no message)"}
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-vs-text-secondary">
                  <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 hover:text-vs-gold">
                    <Mail size={13} /> {e.email}
                  </a>
                  <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1.5 hover:text-vs-gold">
                    <Phone size={13} /> {e.phone}
                  </a>
                  <span className="chip">Prefers {e.contact_preference}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default SellerEnquiries;
