# VisitSarva

A zero-brokerage real estate marketplace for India. Buyers can browse verified property listings, enquire directly with sellers, and get AI-assisted property search. Sellers can list properties and manage them from a dashboard. Admins can verify listings, manage users, and configure site content.

## Stack

- **Frontend**: React (CRA + craco), Tailwind CSS, shadcn/ui, Zustand, React Router v7 — runs on port 5000
- **Backend**: FastAPI (Python), MongoDB (Motor async driver), JWT auth — runs on port 8001
- **Notifications**: Resend (email), Twilio (WhatsApp)
- **AI features**: Google Gemini / OpenAI for smart search and chatbot

## Running the project

Two workflows must be running:

1. **Backend API** — `cd backend && pip install -r requirements.txt -q && uvicorn server:app --host 0.0.0.0 --port 8001 --reload`
2. **Start application** — `cd frontend && DANGEROUSLY_DISABLE_HOST_CHECK=true PORT=5000 yarn start`

Frontend proxies `/api` requests to the backend via `src/setupProxy.js`.

## Required secrets

| Secret | Purpose |
|--------|---------|
| `MONGO_URL` | MongoDB Atlas connection string |
| `JWT_SECRET` | Signs auth tokens |

## Optional secrets

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Email notifications (enquiries, status updates) |
| `TWILIO_ACCOUNT_SID` | WhatsApp alerts |
| `TWILIO_AUTH_TOKEN` | WhatsApp alerts |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender number |
| `OPENAI_API_KEY` | LLM-powered smart search |
| `ADMIN_EMAIL` | Seed admin login (default: admin@visitsarva.in) |
| `ADMIN_PASSWORD` | Seed admin password (default: VisitSarva@2025) |

## Environment variables (already set)

- `CLIENT_URL` — public URL of the frontend
- `EMAIL_FROM` — sender address for emails
- `RESEND_NOTIFY_EMAIL` — admin notification email override
- `N8N_WEBHOOK_URL` — n8n webhook for chat escalation
- `REACT_APP_BACKEND_URL` — set to `/api` (relative, works across environments)

## User preferences

- Keep existing project structure — do not restructure or migrate the stack.
