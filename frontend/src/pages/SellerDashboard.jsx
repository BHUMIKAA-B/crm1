import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Pencil, Trash2, BadgeCheck, Clock, X as XIcon } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import api from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { INR, formatArea, CATEGORY_LABEL } from "@/utils/format";

const STATUS_META = {
  pending_verification: { l: "Pending review", c: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", Icon: Clock },
  published:           { l: "Live",            c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", Icon: BadgeCheck },
  rejected:            { l: "Rejected",         c: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", Icon: XIcon },
  changes_requested:   { l: "Needs changes",    c: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", Icon: Clock },
  sold:                { l: "Sold",             c: "bg-[#171717] text-white", Icon: BadgeCheck },
  rented:              { l: "Rented",           c: "bg-[#171717] text-white", Icon: BadgeCheck },
  verified:            { l: "Verified",         c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", Icon: BadgeCheck },
};

const SellerDashboard = () => {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    api
      .get("/seller/properties")
      .then(({ data }) => setItems(data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => reload(), []);

  const counts = items.reduce(
    (acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }),
    {}
  );

  const remove = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await api.delete(`/seller/properties/${id}`);
      toast.success("Listing deleted");
      reload();
    } catch (err) {
      toast.error("Could not delete");
    }
  };

  return (
    <div className="min-h-screen bg-vs-bg">
      <Navbar />
      <section className="bg-vs-bg border-b border-vs-border pt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-vs-text-primary" data-testid="seller-dashboard-title">
              Hello, {user?.name?.split(" ")[0] || "Seller"}
            </h1>
            <p className="text-sm text-vs-text-secondary mt-1">
              Manage your listings, track enquiries, and create new properties.
            </p>
          </div>
          <Link to="/seller/listings/new" className="btn-primary" data-testid="new-listing-btn">
            <Plus size={15} /> New Listing
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Stat label="Total" value={items.length} />
          <Stat label="Live" value={counts.published || 0} accent />
          <Stat label="Pending review" value={(counts.pending_verification || 0) + (counts.changes_requested || 0)} />
          <Stat label="Rejected" value={counts.rejected || 0} />
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-vs-gold" />
          </div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-vs-text-secondary">You have no listings yet.</p>
            <Link to="/seller/listings/new" className="btn-primary mt-4">
              <Plus size={15} /> Create your first listing
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((p) => {
              const meta = STATUS_META[p.status] || {};
              const Icon = meta.Icon;
              return (
                <div key={p.id} className="card p-5 flex flex-col md:flex-row md:items-center gap-4" data-testid={`seller-listing-${p.id}`}>
                  <div className="w-full md:w-28 h-24 md:h-20 rounded overflow-hidden bg-vs-bg">
                    {p.images?.[0]?.url && (
                      <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="chip">{CATEGORY_LABEL[p.category]}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 ${meta.c || ""}`}>
                        {Icon ? <Icon size={11} /> : null} {meta.l || p.status}
                      </span>
                    </div>
                    <div className="font-display font-semibold text-vs-text-primary mt-1.5">
                      {p.title}
                    </div>
                    <div className="text-xs text-vs-text-secondary mt-1">
                      {INR(p.price)} · {formatArea(p.area)} · {p.location?.city || "—"}
                    </div>
                    {(p.status === "rejected" || p.status === "changes_requested") && p.rejection_reason && (
                      <div className={`text-xs mt-2 p-2 rounded ${
                        p.status === "changes_requested"
                          ? "text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/20"
                          : "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20"
                      }`}>
                        {p.status === "changes_requested" ? "Changes needed: " : "Reason: "}
                        {p.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {p.status === "published" && (
                      <Link to={`/properties/${p.id}`} className="btn-outline !py-2 !px-3">
                        View
                      </Link>
                    )}
                    <Link
                      to={`/seller/listings/${p.id}/edit`}
                      className={`btn-outline !py-2 !px-3 ${p.status === "changes_requested" ? "!border-orange-400 !text-orange-600" : ""}`}
                      data-testid={`edit-${p.id}`}
                    >
                      {p.status === "changes_requested" ? (
                        <><Pencil size={14} /> Resubmit</>
                      ) : (
                        <Pencil size={14} />
                      )}
                    </Link>
                    <button onClick={() => remove(p.id)} className="btn-outline !py-2 !px-3 !text-[#DC2626]" data-testid={`delete-${p.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

const Stat = ({ label, value, accent }) => (
  <div
    className={
      accent
        ? "p-4 rounded-lg overflow-hidden bg-vs-gold text-white border border-vs-gold"
        : "card p-4"
    }
  >
    <div className={`text-xs uppercase tracking-wider ${accent ? "text-white/85" : "text-vs-text-secondary"}`}>
      {label}
    </div>
    <div className={`font-display text-3xl font-bold mt-1 ${accent ? "text-white" : "text-vs-text-primary"}`}>
      {value}
    </div>
  </div>
);

export default SellerDashboard;
