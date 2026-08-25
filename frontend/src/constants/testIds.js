// Centralised data-testid registry for Sarvabhoomi Realty landing page
export const NAV = {
  root: "nav-root",
  logo: "nav-logo",
  linkProperties: "nav-link-properties",
  linkAbout: "nav-link-about",
  linkServices: "nav-link-services",
  linkContact: "nav-link-contact",
  ctaConsult: "nav-cta-consult",
  mobileToggle: "nav-mobile-toggle",
};

export const HERO = {
  root: "hero-root",
  ctaPrimary: "hero-cta-primary",
  ctaSecondary: "hero-cta-secondary",
};

export const SEARCH = {
  root: "search-root",
  selectType: "search-select-type",
  selectCity: "search-select-city",
  selectBhk: "search-select-bhk",
  inputBudget: "search-input-budget",
  submit: "search-submit",
  results: "search-results",
  resultCount: "search-result-count",
};

export const PROPERTIES = {
  root: "properties-root",
  filterAll: "filter-all",
  filterResidential: "filter-residential",
  filterCommercial: "filter-commercial",
  filterPlots: "filter-plots",
  card: (id) => `property-card-${id}`,
  enquire: (id) => `property-enquire-${id}`,
};

export const ABOUT = { root: "about-root" };

export const SERVICES = { root: "services-root" };

export const STATS = { root: "stats-root" };

export const TESTIMONIALS = {
  root: "testimonials-root",
  prev: "testimonials-prev",
  next: "testimonials-next",
  item: (id) => `testimonial-${id}`,
};

export const CONTACT = {
  root: "contact-root",
  name: "contact-name",
  email: "contact-email",
  phone: "contact-phone",
  interest: "contact-interest",
  location: "contact-location",
  message: "contact-message",
  submit: "contact-submit",
};

export const FOOTER = { root: "footer-root" };

export const HOME = { emergentLink: "emergent-link" };
