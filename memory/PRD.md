# VisitSarva — Product Requirements Document

## Problem Statement (verbatim from user)
> Build VisitSarva — a zero-brokerage real-estate marketplace connecting verified sellers directly to buyers. No brokers. Sellers list properties, our internal team verifies and publishes them. Buyers browse and contact our team directly.

## Brand
- **Name:** VisitSarva
- **Tagline:** Buy property, pay no brokerage.
- **Colours:** Deep teal #0D7A6B (primary), Dark navy #0F2340 (secondary), light-grey backgrounds.
- **Fonts:** Inter (body) + Poppins (display).

## Stack adopted (Emergent constraint)
- FastAPI + React (CRA) + MongoDB — see /app/memory/test_credentials.md for seed accounts.
- Original spec asked for Node.js/Express/Vite — adapted to Emergent's stack 1-for-1.

## User personas
1. **Buyer** — browses verified listings, sends enquiry, requests document services.
2. **Seller** — lists properties (AI-assisted), tracks enquiries.
3. **Admin (VisitSarva team)** — verifies/rejects listings, manages users, monitors enquiries & service requests.

## Phase 1 — IMPLEMENTED (Dec 2025)
### Auth
- JWT access + refresh tokens, bcrypt passwords, role-based access (buyer/seller/admin).
- Admin self-register is blocked; admin is seeded.
- Endpoints: `/api/auth/register`, `/login`, `/refresh-token`, `/me`.

### Properties
- Public list with filters (category, city, price min/max, bedrooms, sort_by, pagination) + featured + detail (auto-increment views).
- Seller CRUD with admin-verification workflow (status: pending_verification → published / rejected).
- 8 property categories: commercial, residential, plot, agriculture, apartment, rental, industrial, construction_interior.
- Images stored as base64 data URLs (MVP — see backlog for Cloudinary migration).
- Saved properties (buyer): POST/DELETE `/api/users/me/saved/{id}`, GET `/api/users/me/saved`.

### Admin Console
- Pending-queue verification (approve / reject with reason).
- Users list with activate/deactivate.
- Enquiries + Service-requests views.
- Stats dashboard.

### Buyer
- Personalised home + AI smart search.
- My Enquiries, Saved Properties pages.

### Enquiries
- Public + authed POST `/api/enquiries`; increments `enquiries` counter on the property.

### All-in-One Document Services
- 7 service types (pre-registration, khata, valuation, land/plan/government approval, conversion).
- POST `/api/services`, GET `/api/services/my`.

### AI (Anthropic Claude — claude-4-sonnet-20250514 via Emergent LLM key)
- **Listing Assistant** — multi-turn chat that auto-fills the listing form (title, category, bedrooms, area, location, amenities, etc.). Prompt enforces re-emission of all confirmed fields + draft-title generation.
- **Smart Search** — natural-language buyer search that converts the query into structured filters and returns matching listings with a friendly summary.

### Landing Page
- Sticky navbar, hero with AI search, 8 sector cards, featured properties, role CTAs (buyer/seller), motive section ("Buy property, pay no brokerage"), how-it-works tabs, services grid, stats, testimonials, footer.

### Maps
- Leaflet + OpenStreetMap on property detail (no API key needed).

## Tests
- Backend pytest suite: 30/30 passed — `/app/backend/tests/backend_test.py`.
- Frontend Playwright: critical flows green (landing render, login by role, browse + filter, property detail + enquiry, AI smart search, AI listing assistant autofill, admin approve, services request).
- Test reports: `/app/test_reports/iteration_1.json`, `iteration_2.json`.

## Backlog — P1 (deferred from spec)
- **Image upload via Cloudinary** (currently base64 → bloats Mongo at scale).
- **Email notifications** (welcome, verification, listing-status changes, new enquiry) via Nodemailer-equivalent (e.g. Resend / SendGrid).
- **Phone OTP verification** + email verification link.
- **Real-time chat** between buyer ↔ team (Socket.io equivalent = FastAPI WebSocket).
- **Notifications model** + `/api/notifications` UI surface.
- **Edit listing UI** (currently delete-only on dashboard; backend PUT exists).
- **Map pin-drop** on the New Listing form.
- **Multi-step wizard UI** on New Listing (current is single long form with AI sidebar — works fine).
- **Document upload** on listings.
- **Rate-limiting** on auth + enquiry endpoints (Helmet/express-rate-limit equivalent).

## Backlog — P2
- Buyer "Recommended for you" personalisation based on search history.
- Seller premium placement upgrade flow.
- Admin → assign service-request to a specific team member.
- Google OAuth login.
- Listings analytics for sellers (views graph, enquiry conversion).

## Repo / Deploy
- GitHub push: user opted for "Save to GitHub" via Profile → GitHub integration (Profile → Integrations → GitHub → Connect, then Save-to-GitHub panel → existing repo `sarvahub-hue/realestate-29`).
- Emergent deploy: app is deploy-ready on Emergent (FastAPI + CRA + Mongo).

## Notable Files
- Backend: `/app/backend/server.py`, `/app/backend/auth.py`, `/app/backend/routers/*`, `/app/backend/seed.py`.
- Frontend: `/app/frontend/src/pages/Landing.jsx`, `Login.jsx`, `Register.jsx`, `PropertiesList.jsx`, `PropertyDetail.jsx`, `BuyerHome.jsx`, `SellerDashboard.jsx`, `NewListing.jsx` (AI), `AdminDashboard.jsx`, `Services.jsx`.
- Auth store: `/app/frontend/src/store/authStore.js` (Zustand + persist).
