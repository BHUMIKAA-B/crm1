import React, { useState } from "react";
import "./VisitSarvaServices.css";
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
    title: "Encumbrance Certificate",
    Icon: FileSearch2,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&auto=format&fit=crop&q=80",
    alt: "Property records and paperwork arranged for review",
  },
  {
    title: "Certified Sale Deed Copy",
    Icon: FileText,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&auto=format&fit=crop&q=80",
    alt: "A property deed document being reviewed",
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
  const selectedServiceDetails = SERVICE_OPTIONS.find(
    ({ title, subOptions }) => title === selectedService || subOptions?.includes(selectedService)
  );

  return (
    <section
      id="our-special-services"
      className="vs-universe scroll-mt-20 py-16 md:py-24"
      data-testid="our-special-services-section"
      aria-labelledby="our-special-services-title"
    >
      <div className="vs-universe__inner mx-auto max-w-[80rem] px-6 lg:px-12">
        <div className="vs-universe__heading mb-10 flex flex-col gap-3 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="vs-universe__eyebrow mb-2">VISITSARVA PROPERTY CARE</p>
            <h2 id="our-special-services-title" className="vs-universe__title">Our Special Services</h2>
          </div>
          <p className="vs-universe__intro max-w-lg text-sm leading-relaxed md:text-base">
            Thoughtful support for every chapter of owning a home.
          </p>
        </div>

        <div className="vs-universe__constellation">
          <svg className="vs-universe__routes vs-universe__routes--desktop" viewBox="0 0 1120 953" preserveAspectRatio="none" aria-hidden="true">
            <path d="M451 430 C420 375 400 313 383 262" />
            <path d="M560 384 V183" />
            <path d="M669 430 C710 365 755 298 789 248" />
            <path d="M405 539 C355 535 310 525 263 512" />
            <path d="M715 539 C765 535 812 524 857 513" />
            <path d="M472 670 C430 687 400 706 374 722" />
            <path d="M648 670 C697 690 731 709 754 731" />
          </svg>
          <svg className="vs-universe__routes vs-universe__routes--tablet" viewBox="0 0 764 868" preserveAspectRatio="none" aria-hidden="true">
            <path d="M300 386 C260 340 215 290 180 245" />
            <path d="M382 368 V183" />
            <path d="M464 386 C504 340 549 290 584 242" />
            <path d="M261 489 H242" />
            <path d="M503 489 H522" />
            <path d="M302 588 C250 606 190 624 120 637" />
            <path d="M462 588 C514 606 574 628 643 645" />
          </svg>
          <svg className="vs-universe__routes vs-universe__routes--mobile" viewBox="0 0 334 1304" preserveAspectRatio="none" aria-hidden="true">
            <path d="M167 250 V276" />
            <path d="M167 588 V598 H80 V608 M167 598 H255 V608" />
            <path d="M80 832 V842 H167 M255 814 V842 H167" />
            <path d="M167 842 V852 H80 M167 852 H255" />
            <path d="M80 1058 V1068 H167 M255 1058 V1068 H167" />
            <path d="M167 1068 V1078 H80 M167 1068 H255 V1078" />
          </svg>
          <div className="vs-universe__center" aria-hidden="true">
            <span className="vs-universe__center-mark"><House size={28} strokeWidth={1.4} /></span>
            <span className="vs-universe__center-kicker">VISITSARVA</span>
            <span className="vs-universe__center-title">Home, in<br />good hands.</span>
            <span className="vs-universe__center-caption">Seven ways we make it easier</span>
          </div>

          {SERVICE_OPTIONS.map(({ title, Icon, image, alt, subOptions }, index) => (
            <article
              key={title}
              className={`vs-service vs-service--${index + 1}${subOptions ? " vs-service--khata" : ""}`}
              data-testid={`visit-service-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <button
                type="button"
                className="vs-service__button"
                onClick={() => setSelectedService(title)}
                aria-label={`View details for ${title}`}
              >
                <span className="vs-service__visual">
                  <img
                    src={image}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="vs-service__shade" />
                  <span className="vs-service__number">0{index + 1}</span>
                  <span className="vs-service__icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                  <span className="vs-service__action" aria-hidden="true">View service <span>↗</span></span>
                </span>
                <span className="vs-service__label-row">
                  <span className="vs-service__label">
                    {title}
                  </span>
                  <span className="vs-service__arrow" aria-hidden="true">↗</span>
                </span>
              </button>

              {subOptions && (
                <div className="vs-service__options" aria-label="Khata service options">
                  <p className="vs-service__options-title">Choose a Khata service</p>
                  <div className="vs-service__option-list">
                    {subOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedService(option)}
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
        <DialogContent className="vs-service-dialog border-vs-border bg-vs-bg text-vs-text-primary sm:max-w-lg">
          {selectedServiceDetails && (
            <div className="vs-service-dialog__image">
              <img src={selectedServiceDetails.image} alt={selectedServiceDetails.alt} />
              <span><selectedServiceDetails.Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
            </div>
          )}
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="vs-service-dialog__title font-display text-xl font-medium text-vs-text-primary">
              {selectedService}
            </DialogTitle>
            <DialogDescription className="vs-service-dialog__description pt-2 leading-relaxed text-vs-text-secondary">
              {SERVICE_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" className="vs-service-dialog__close btn-primary min-h-10 px-5 py-2 text-sm">
                <span aria-hidden="true">←</span> Back to services
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VisitSarvaServices;