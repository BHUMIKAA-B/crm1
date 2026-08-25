// Applies an admin-configurable accent color to the CSS custom properties
// that drive the `vs-gold` / `vs-primary` design tokens across the app.

const hexToRgb = (hex) => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const shade = ({ r, g, b }, amount) => {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return {
    r: clamp(r + (0 - r) * amount),
    g: clamp(g + (0 - g) * amount),
    b: clamp(b + (0 - b) * amount),
  };
};

export const applyAccentColor = (hex) => {
  if (!hex) return;
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const hover = shade(rgb, isDark ? -0.2 : 0.22); // darken for light mode, lighten for dark mode

  root.style.setProperty("--vs-primary", hex);
  root.style.setProperty("--vs-primary-rgb", `${rgb.r} ${rgb.g} ${rgb.b}`);
  root.style.setProperty("--vs-primary-hover-rgb", `${hover.r} ${hover.g} ${hover.b}`);
  root.style.setProperty("--vs-primary-muted", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
};
