---
name: Tailwind dark mode via CSS var RGB triplets
description: How VisitSarva's dark/light toggle is wired so Tailwind opacity modifiers (e.g. bg-vs-bg/70) keep working across themes
---

Tailwind `vs.*` color tokens in `tailwind.config.js` are defined as `rgb(var(--vs-x-rgb) / <alpha-value>)`, not plain hex. Each token needs both a plain CSS var (`--vs-bg`) for raw CSS use and an `-rgb` triplet var (`--vs-bg-rgb: 255 255 255`) for Tailwind. `.dark` in `index.css` overrides both sets. `next-themes` `<ThemeProvider attribute="class">` toggles the `.dark` class on `<html>`.

**Why:** Tailwind's arbitrary opacity syntax (`bg-vs-bg/70`) only works if the color function accepts `<alpha-value>`; a var()-only definition silently breaks opacity modifiers used throughout the app.

**How to apply:** When adding a new semantic color token, always add both the hex/rgba var and the space-separated `-rgb` triplet var, and set both in `:root` and `.dark`. Raw Tailwind arbitrary hex classes (`bg-[#FFFFFF]`) do NOT respond to `.dark` — they must be migrated to the semantic `vs-*` classes to theme correctly. Intentional always-dark elements (e.g. `bg-[#171717] text-white` badges/CTA panels meant to stay dark in both themes) should be left as literal hex, not converted.
