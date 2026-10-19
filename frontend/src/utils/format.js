export const INR = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (n >= 1e7) return `₹ ${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹ ${(n / 1e5).toFixed(2)} L`;
  return `₹ ${n.toLocaleString("en-IN")}`;
};

export const formatArea = (area) => {
  if (!area) return "—";
  const u = area.unit || "sqft";
  return `${Number(area.size || 0).toLocaleString("en-IN")} ${u}`;
};

export const PROPERTY_CATEGORIES = [
  { value: "residential", label: "Residential", icon: "home" },
  { value: "commercial", label: "Commercial", icon: "building" },
  { value: "plot", label: "Plots", icon: "trees" },
  { value: "agriculture", label: "Agriculture", icon: "wheat" },
  { value: "apartment", label: "Apartments", icon: "building-2" },
  { value: "rental", label: "Rentals", icon: "key" },
  { value: "industrial", label: "Industrial", icon: "factory" },
  { value: "construction_interior", label: "Construction & Interiors", icon: "hard-hat" },
];

export const CATEGORY_LABEL = Object.fromEntries(
  PROPERTY_CATEGORIES.map((c) => [c.value, c.label])
);

export const SERVICE_TYPES = [
  { value: "pre_registration", label: "Pre-Registration Assistance" },
  { value: "khata_assistance", label: "Khata Assistance" },
  { value: "property_valuation", label: "Property Valuation" },
  { value: "land_approval", label: "Land Approval" },
  { value: "plan_approval", label: "Plan Approval" },
  { value: "property_conversion", label: "Property Conversion" },
  { value: "government_approval", label: "Government Approval" },
];
