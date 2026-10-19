# Architecture

Visit Sarva CRM is a full-stack web application built on the existing property portal foundation.

## Tech Stack
- **Frontend**: React (Create React App via Craco), React Router DOM, Zustand (State Management), Tailwind CSS + MUI + Radix UI.
- **Backend**: Python FastAPI, Motor (Async MongoDB Driver), Pydantic (Validation & Models), JOSE (JWT Auth).
- **Database**: MongoDB.
- **Deployment**: Configured for Railway using environment variables.

## System Design
The internal CRM operates alongside the public property portal.
- Public users (buyers/sellers) hit `/api/auth` and use the `/home` routes.
- Internal employees hit `/api/crm/auth` and use the `/crm` dashboard.
- Business logic is strictly separated via specific routers (`crm_leads_router`, `crm_deals_router`) preventing data leaks to public users.
- Permissions are enforced backend-first using dependency injection (`rbac_service.py`), ensuring frontend UI hides cannot be bypassed via direct API calls.
