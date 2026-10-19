# Deployment Architecture

The application is deployed on **Railway** as a unified full-stack monorepo.

## Build Process
1. During deployment, Railway detects the `package.json` in the frontend directory (if configured properly via Nixpacks) or builds the React app and serves it using FastAPI's static file hosting.
2. The `backend/server.py` is the entry point. It serves the `/api` endpoints and mounts the compiled `frontend/build` folder to serve the React SPA at `/`.

## Environment Variables
The following environment variables are required in the production environment:

```env
# Database
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/visitsarva

# Security
JWT_SECRET=super_secure_random_string_here
CORS_ORIGINS=https://visitsarva.com,http://localhost:3000

# AWS Cognito (Public Auth)
REACT_APP_COGNITO_DOMAIN=your-cognito-domain.auth.region.amazoncognito.com
REACT_APP_COGNITO_CLIENT_ID=your_client_id
```

## Running the Application
To run the server in production mode:
```bash
uvicorn backend.server:app --host 0.0.0.0 --port $PORT
```

## Seeding Production Database
Before first use by the internal team, you must seed the foundation employee roles. Run:
```bash
python backend/crm_seed.py
```
This script respects the `MONGO_URL` variable and will create the founder and admin accounts required to manage the CRM.
