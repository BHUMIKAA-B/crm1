/**
 * Reusable helpers for the four contact actions:
 *   downloadBrochureForProperty, buildEmailUrl, buildWhatsAppUrl
 *
 * All helpers accept a `property` object and a `formData` object
 * { name, email, phone, message } so they can pre-fill messages.
 */
import api from "@/api/client";
import { CONSULTANT } from "@/config/consultant";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatPrice(price) {
  if (!price) return "On Request";
  if (price >= 1e7) return `Rs. ${(price / 1e7).toFixed(2)} Cr`;
  if (price >= 1e5) return `Rs. ${(price / 1e5).toFixed(2)} L`;
  return `Rs. ${price.toLocaleString("en-IN")}`;
}

function buildLocation(property) {
  const loc = property?.location || {};
  return [loc.address, loc.city, loc.state].filter(Boolean).join(", ") || "Not specified";
}

// ─── Download brochure ────────────────────────────────────────────────────────

/**
 * Calls the brochure API and triggers a PDF download.
 * Throws with a user-readable message if unavailable.
 */
export async function downloadBrochureForProperty({ propertyId, property, name, phone, email }) {
  const res = await api.post(
    "/brochure/download",
    { property_id: propertyId, name, phone, ...(email ? { email } : {}) },
    { responseType: "blob" }
  );

  // 404 / error responses come back as a JSON blob
  const contentType = res.headers["content-type"] || "";
  if (!contentType.includes("application/pdf")) {
    throw new Error("Brochure is currently unavailable.");
  }

  const safeTitle = (property?.title || "Brochure").slice(0, 40).replace(/\s+/g, "_");
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `VisitSarva-${safeTitle}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Email ────────────────────────────────────────────────────────────────────

/**
 * Returns a fully-encoded mailto: URL pre-filled with property + user details.
 */
export function buildEmailUrl(property, formData) {
  const locationStr = buildLocation(property);
  const price = formatPrice(property?.price);
  const subject = `Property Enquiry - ${property?.title || ""}`;
  const body = [
    `Hello ${CONSULTANT.name},`,
    ``,
    `I am interested in the following property.`,
    ``,
    `Property: ${property?.title || ""}`,
    `Location: ${locationStr}`,
    `Price: ${price}`,
    ``,
    `My Details`,
    `Name: ${formData.name || ""}`,
    `Email: ${formData.email || ""}`,
    `Phone: ${formData.phone || ""}`,
    `Message: ${formData.message || ""}`,
    ``,
    `Please contact me regarding this property.`,
    ``,
    `Thank you.`,
  ].join("\n");

  return `mailto:${CONSULTANT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

/**
 * Returns a wa.me URL with a pre-filled message containing property + user details.
 */
export function buildWhatsAppUrl(property, formData) {
  const locationStr = buildLocation(property);
  const price = formatPrice(property?.price);
  const message = [
    `Hello ${CONSULTANT.name},`,
    ``,
    `I am interested in the property:`,
    ``,
    `Property: ${property?.title || ""}`,
    `Location: ${locationStr}`,
    `Price: ${price}`,
    ``,
    `My Details`,
    `Name: ${formData.name || ""}`,
    `Email: ${formData.email || ""}`,
    `Phone: ${formData.phone || ""}`,
    `Message: ${formData.message || ""}`,
    ``,
    `Please let me know more about this property.`,
    ``,
    `Thank you.`,
  ].join("\n");

  return `https://wa.me/${CONSULTANT.whatsapp}?text=${encodeURIComponent(message)}`;
}
