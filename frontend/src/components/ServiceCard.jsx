// ServiceCard component implementation
import React, { useState } from "react";
import { X } from "lucide-react";

/**
 * ServiceCard displays a service with an icon, image, and title.
 * If subOptions are provided, they are shown inside a simple modal.
 */
const ServiceCard = ({ title, Icon, imgUrl, subOptions }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(true);
  };

  return (
    <>
      <div
        className="card p-4 flex flex-col items-center text-center cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter') handleClick(); }}
        data-testid={`service-card-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <div className="w-12 h-12 mb-3 rounded-lg bg-vs-gold/10 flex items-center justify-center">
          {Icon && <Icon size={22} className="text-vs-gold" />}
        </div>
        {imgUrl && (
          <img src={imgUrl} alt={title} className="w-full h-32 object-cover rounded mb-3" loading="lazy" />
        )}
        <h3 className="font-display font-medium text-vs-text-primary text-lg">{title}</h3>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1">
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
                        setOpen(false);
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

export default ServiceCard;
