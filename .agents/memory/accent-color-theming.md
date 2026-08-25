---
name: Accent color theming
description: How the admin-editable site accent color propagates through the app at runtime
---

The app's accent color is admin-configurable (Site Settings tab) and takes effect instantly without a rebuild.

This only works because every component references the shared Tailwind tokens `vs-gold` / `vs-primary` (which both resolve to `rgb(var(--vs-primary-rgb) / <alpha-value>)`), never a hardcoded hex value.

**Why:** Tailwind arbitrary hex classes like `bg-[#78AFCF]` bypass the CSS variable, so they can't be recolored at runtime. Any new UI must use the `vs-gold`/`vs-primary` tokens (or `var(--vs-primary)` inline) instead of literal hex/arbitrary-value classes, or it will silently ignore the admin's chosen accent color.

**How to apply:** When adding new components, use `text-vs-gold`, `bg-vs-primary`, `border-vs-gold`, etc. The runtime override itself lives in `frontend/src/lib/theme.js` (`applyAccentColor(hex)`), which is called on app mount (`App.js`) and after saving in the admin Site Settings tab. Hover-shade direction differs by theme (darken in light mode, lighten in dark mode) — already handled inside `applyAccentColor`.
