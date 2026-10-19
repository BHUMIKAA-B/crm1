"""
Vercel Python serverless entrypoint for VisitSarva CRM.

This file is the ONLY file Vercel executes for Python functions.
It imports the FastAPI `app` from the backend and exposes it for
Vercel's ASGI handler. No uvicorn.run() is called here.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path so all backend imports resolve correctly
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Import and re-export the FastAPI application
# server.py sets up all routers, middleware, and startup events
from server import app  # noqa: F401, E402
