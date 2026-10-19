# Visit Sarva — Internal Real Estate CRM

Visit Sarva is a dual-platform application:
1. A public-facing property portal.
2. A private, enterprise-grade internal CRM for managing the entire real estate business pipeline.

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE.md)
- [Role-Based Access Control (RBAC)](docs/RBAC.md)
- [API Design](docs/API.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Deployment](docs/DEPLOYMENT.md)

## Setup & Development
1. Configure `.env` in `backend/` using `.env.example`.
2. Start MongoDB locally (port 27017).
3. Run `python backend/crm_seed.py` in the root directory to generate demo employees, properties, and leads.
4. Start backend: `fastapi run backend/server.py` (or uvicorn).
5. Start frontend: `yarn start` or `npm start` in the `frontend/` directory.

## Deployment
The project is built to deploy on Railway out-of-the-box. Ensure all environment variables (especially `MONGO_URL` and `JWT_SECRET`) are provided in the Railway dashboard.
