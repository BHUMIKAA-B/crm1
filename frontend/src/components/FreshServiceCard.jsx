import React, { useState, useCallback } from "react";
import { X } from "lucide-react";

/**
 * FreshServiceCard – a brand‑new implementation for the public services section.
 * Displays an image, title and optional icon. On click, opens a lightweight modal
 * with a placeholder message. For the "Khata Services" card, a dropdown of four
 * sub‑options is rendered; each sub‑option can be clicked independently.
 */
const FreshServiceCard = ({ title, Icon, imgUrl, subOptions }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <div
        className="card p-4 flex flex-col items-center text-center cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === "Enter") handleOpen();
        }}
        data-testid={`fresh-service-card-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <div className="w-12 h-12 mb-3 rounded-lg bg-vs-gold/10 flex items-center justify-center">
          {Icon && <Icon size={22} className="text-vs-gold" />}
        </div>
        {imgUrl && (
          <img
            src={imgUrl}
            alt={title}
            className="w-full h-32 object-cover rounded mb-3"
            loading="lazy"
          />
        )}
        <h3 className="font-display font-medium text-vs-text-primary text-lg">
          {title}
        </h3>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-lg p-6 w-11/12 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="p-1 rounded-lg hover:bg-vs-surface"
              >
                <X size={20} />
              </button>
            </div>
            {subOptions ? (
              <ul className="space-y-2">
                {subOptions.map((sub) => (
                  <li key={sub}>
                    <button
                      className="text-left w-full hover:underline"
                      onClick={() => {
                        alert(`More details about ${sub} will be available soon.`);
                        handleClose();
                      }}
                    >
                      {sub}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>More details about this service will be available soon.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FreshServiceCard;
