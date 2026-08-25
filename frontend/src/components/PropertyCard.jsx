import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Bed, Maximize2, BadgeCheck, Bookmark, FileDown } from "lucide-react";
import { INR, formatArea, CATEGORY_LABEL } from "@/utils/format";
import BrochureModal from "@/components/BrochureModal";

const fallbackImg =
  "https://images.pexels.com/photos/36676879/pexels-photo-36676879.jpeg?auto=compress&cs=tinysrgb&w=900";

const PropertyCard = ({ property, onSave, isSaved, showBrochure = true }) => {
  const [brochureOpen, setBrochureOpen] = useState(false);
  const img = property.images?.[0]?.url || fallbackImg;
  const loc = property.location || {};
  return (
    <motion.article
      data-testid={`property-card-${property.id}`}
      className="group overflow-hidden rounded-[1.75rem] border border-vs-border bg-vs-bg shadow-premium-sm transition-all duration-300 hover:-translate-y-1 hover:border-vs-primary"
      whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
    >
      <Link
        to={`/properties/${property.id}`}
        className="block relative overflow-hidden rounded-t-[1.5rem] bg-vs-surface"
      >
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={img}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-vs-bg/80 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-vs-bg/90 px-3 py-2 text-[11px] font-medium text-vs-text-primary shadow-sm backdrop-blur border border-vs-border/30">
          {CATEGORY_LABEL[property.category] || property.category}
        </div>
        {property.is_featured && (
          <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-vs-primary text-vs-bg px-3 py-2 text-[11px] font-semibold shadow-sm">
            <BadgeCheck size={12} /> Verified
          </div>
        )}
      </Link>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-vs-text-primary leading-snug line-clamp-2">
            <Link
              to={`/properties/${property.id}`}
              className="hover:text-vs-primary transition-colors duration-300"
            >
              {property.title}
            </Link>
          </h3>
          {onSave && (
            <button
              data-testid={`property-save-${property.id}`}
              onClick={() => onSave(property.id)}
              className={`rounded-2xl p-2 transition-all duration-300 ${
                isSaved
                  ? "bg-vs-primary/10 text-vs-primary"
                  : "text-vs-text-muted hover:bg-vs-primary/10 hover:text-vs-primary"
              }`}
              aria-label="Save property"
            >
              <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-vs-text-secondary">
          <span className="flex items-center gap-2">
            <MapPin size={14} className="text-vs-primary" />
            {loc.city || loc.address || "—"}{loc.state ? `, ${loc.state}` : ""}
          </span>
          {property.bedrooms ? (
            <span className="flex items-center gap-2">
              <Bed size={14} className="text-vs-primary" /> {property.bedrooms} BHK
            </span>
          ) : null}
          <span className="flex items-center gap-2">
            <Maximize2 size={14} className="text-vs-primary" /> {formatArea(property.area)}
          </span>
        </div>
        <div className="mt-auto border-t border-vs-border pt-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-vs-text-muted mb-1">Price</div>
            <div className="font-display text-xl font-semibold text-vs-primary">
              {INR(property.price)}
              {property.category === "rental" && (
                <span className="text-xs font-normal text-vs-text-muted ml-1">/mo</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showBrochure && (
              <button
                onClick={(e) => { e.preventDefault(); setBrochureOpen(true); }}
                className="btn-primary text-xs px-3 py-2"
                title="Download Brochure"
              >
                <FileDown size={13} /> Brochure
              </button>
            )}
            <Link
              to={`/properties/${property.id}`}
              data-testid={`property-view-${property.id}`}
              className="btn-secondary text-xs px-4 py-2"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>

      {brochureOpen && (
        <BrochureModal property={property} onClose={() => setBrochureOpen(false)} />
      )}
    </motion.article>
  );
};

export default PropertyCard;
