import React, { useState } from "react";
import {
  Brush,
  FileCheck2,
  FileSearch2,
  FileText,
  Hammer,
  House,
  Truck,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SERVICE_OPTIONS = [
  {
    title: "Interior Designing",
    Icon: House,
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&auto=format&fit=crop&q=80",
    alt: "Bright contemporary living room with thoughtfully designed furnishings",
  },
  {
    title: "Khata Services",
    Icon: FileCheck2,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&auto=format&fit=crop&q=80",
    alt: "Property paperwork arranged on a desk",
    subOptions: ["E-Khata", "B to A Khata", "Mutation / Khata Transfer", "E-Khata Corrections"],
  },
  {
    title: "Encumbrance Certificate (EC)",
    Icon: FileSearch2,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&auto=format&fit=crop&q=80",
    alt: "Official property documents being reviewed",
  },
  {
    title: "Certified Sale Deed Copy",
    Icon: FileText,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&auto=format&fit=crop&q=80",
    alt: "Professional reviewing a property document",
  },
  {
    title: "Painting Services",
    Icon: Brush,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=900&auto=format&fit=crop&q=80",
    alt: "Freshly painted interior wall in a home",
  },
  {
    title: "Renovation / Alteration Services",
    Icon: Hammer,
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&auto=format&fit=crop&q=80",
    alt: "Home renovation work in progress",
  },
  {
    title: "Packers and Movers",
    Icon: Truck,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80",
    alt: "Moving boxes ready to be transported to a new home",
  },
];

const SERVICE_MESSAGE = "More details about this service will be available soon.";

const VisitSarvaServices = () => {
  const [selectedService, setSelectedService] = useState("");

  return (
    <section
      id="our-services"
      className="scroll-mt-20 bg-vs-surface py-16 md:py-20"
      data-testid="our-services-section"
      aria-labelledby="our-services-title"
    >
      <div className="mx-auto max-w-[80rem] px-6 lg:px-12">
        <div className="mb-9 flex flex-col gap-3 sm:mb-11 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2 text-vs-gold">VisitSarva Property Care</p>
            <h2
              id="our-services-title"
              className="font-display text-3xl font-medium text-vs-text-primary md:text-4xl"
            >
              Our Services
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-vs-text-secondary md:text-base">
            Trusted support for your home, property documents, and move.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_OPTIONS.map(({ title, Icon, image, alt, subOptions }) => (
            <article
              key={title}
              className="group overflow-hidden rounded-xl border border-vs-border bg-vs-bg shadow-sm transition duration-200 hover:-translate-y-1 hover:border-vs-primary/60 hover:shadow-lg"
              data-testid={`visit-service-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <button
                type="button"
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vs-primary"
                onClick={() => setSelectedService(title)}
                aria-label={`View details for ${title}`}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-vs-surface">
                  <img
                    src={image}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-vs-bg text-vs-primary shadow-md">
                    <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                </div>
                <span className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3">
                  <span className="font-display text-base font-medium leading-snug text-vs-text-primary">
                    {title}
                  </span>
                  <span className="shrink-0 text-xl leading-none text-vs-gold" aria-hidden="true">
                    &rarr;
                  </span>
                </span>
              </button>

              {subOptions && (
                <div className="border-t border-vs-border px-3 pb-3 pt-2">
                  <p className="px-1 pb-1 text-xs font-semibold uppercase text-vs-text-muted">
                    Khata options
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {subOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedService(option)}
                        className="rounded-md px-2 py-1.5 text-left text-sm text-vs-text-secondary transition hover:bg-vs-surface hover:text-vs-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vs-primary"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(selectedService)} onOpenChange={(open) => !open && setSelectedService("")}>
        <DialogContent className="border-vs-border bg-vs-bg text-vs-text-primary sm:max-w-md">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="font-display text-xl font-medium text-vs-text-primary">
              {selectedService}
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed text-vs-text-secondary">
              {SERVICE_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="btn-primary min-h-10 px-5 py-2 text-sm">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VisitSarvaServices;