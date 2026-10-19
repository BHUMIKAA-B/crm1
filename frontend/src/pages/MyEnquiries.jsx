import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";

const STATUS_LABEL = {
  new: "New",
  viewed: "Viewed",
  responded: "Responded",
  closed: "Closed",
};

const STATUS_COLOR = {
  new: "bg-vs-gold text-white",
  viewed: "bg-vs-bg text-vs-text-primary border border-vs-border",
  responded: "bg-[#171717] text-white",
  closed: "bg-vs-bg text-vs-text-secondary border border-vs-border",
};

const MyEnquiries = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/enquiries/me")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl font-bold text-vs-text-primary">
          My Enquiries
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
              <Link
                key={e.id}
                to={`/properties/${e.property_id}`}
                className="card p-5 flex items-center justify-between gap-4 hover:border-vs-gold"
                data-testid={`my-enquiry-${e.id}`}
              >
                <div>
                  <div className="font-display font-semibold text-vs-text-primary">
                    {e.property_title || "Property"}
                  </div>
                  <div className="text-sm text-vs-text-secondary mt-1">
                    {e.message || `Contact preference: ${e.contact_preference}`}
                  </div>
                  <div className="text-xs text-vs-text-secondary mt-1">
                    {new Date(e.created_at).toLocaleString("en-IN")}
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${STATUS_COLOR[e.status] || ""}`}>
                  {STATUS_LABEL[e.status] || e.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default MyEnquiries;
