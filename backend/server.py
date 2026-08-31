"""VisitSarva — main FastAPI application."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Import after env is loaded
from routers.auth_router import router as auth_router  # noqa: E402
from routers.properties_router import router as properties_router  # noqa: E402
from routers.seller_router import router as seller_router  # noqa: E402
from routers.admin_router import router as admin_router  # noqa: E402
from routers.enquiries_router import router as enquiries_router  # noqa: E402
from routers.services_router import router as services_router  # noqa: E402
from routers.ai_router import router as ai_router  # noqa: E402
from routers.cms_router import router as cms_router  # noqa: E402
from routers.chat_router import router as chat_router  # noqa: E402
from routers.brochure_router import router as brochure_router  # noqa: E402
from seed import ensure_seed  # noqa: E402

from routers.crm_auth_router import router as crm_auth_router
from routers.crm_leads_router import router as crm_leads_router
from routers.crm_properties_router import router as crm_properties_router
from routers.crm_deals_router import router as crm_deals_router
from routers.crm_customers_router import router as crm_customers_router
from routers.crm_tasks_router import router as crm_tasks_router
from routers.crm_employees_router import router as crm_employees_router
from routers.crm_teams_router import router as crm_teams_router
from routers.crm_reports_router import router as crm_reports_router
from routers.crm_search_router import router as crm_search_router
from routers.crm_requirements_router import router as crm_requirements_router
from routers.crm_owners_router import router as crm_owners_router
from routers.crm_brokers_router import router as crm_brokers_router
from routers.crm_followups_router import router as crm_followups_router
from routers.crm_site_visits_router import router as crm_site_visits_router
from routers.crm_property_shares_router import router as crm_property_shares_router
from routers.crm_negotiations_router import router as crm_negotiations_router
from routers.crm_documents_router import router as crm_documents_router
from routers.crm_payments_router import router as crm_payments_router
from routers.crm_commissions_router import router as crm_commissions_router
from routers.crm_notifications_router import router as crm_notifications_router
from routers.crm_audit_logs_router import router as crm_audit_logs_router
from routers.crm_settings_router import router as crm_settings_router


app = FastAPI(title="VisitSarva API")


from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

def _find_build_dir() -> Path:
    candidates = [
        ROOT_DIR.parent / "frontend" / "build",
        Path.cwd() / "frontend" / "build",
        Path("/app/frontend/build"),
        ROOT_DIR / "static_build",
        Path.cwd() / "backend" / "static_build",
        Path("/app/backend/static_build"),
    ]
    for c in candidates:
        if c.exists() and (c / "index.html").exists():
            return c
    return ROOT_DIR / "static_build"


BUILD_DIR = _find_build_dir()


@app.get("/")
async def root_spa():
    target_dir = _find_build_dir()
    index_file = target_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse({"app": "VisitSarva", "tagline": "Buy property, pay no brokerage."})


@app.get("/health")
async def health():
    """Health check endpoint."""
    return JSONResponse({"status": "ok"})


@app.get("/api/")
async def api_root():
    return {"app": "VisitSarva", "tagline": "Buy property, pay no brokerage."}


app.include_router(auth_router)
app.include_router(properties_router)
app.include_router(seller_router)
app.include_router(admin_router)
app.include_router(enquiries_router)
app.include_router(services_router)
app.include_router(ai_router)
app.include_router(cms_router)
app.include_router(chat_router)
app.include_router(brochure_router)

# CRM Routers
app.include_router(crm_auth_router)
app.include_router(crm_leads_router)
app.include_router(crm_customers_router)
app.include_router(crm_requirements_router)
app.include_router(crm_tasks_router)
app.include_router(crm_followups_router)
app.include_router(crm_employees_router)
app.include_router(crm_teams_router)
app.include_router(crm_properties_router)
app.include_router(crm_owners_router)
app.include_router(crm_brokers_router)
app.include_router(crm_site_visits_router)
app.include_router(crm_property_shares_router)
app.include_router(crm_negotiations_router)
app.include_router(crm_deals_router)
app.include_router(crm_documents_router)
app.include_router(crm_payments_router)
app.include_router(crm_commissions_router)
app.include_router(crm_notifications_router)
app.include_router(crm_reports_router)
app.include_router(crm_search_router)
app.include_router(crm_audit_logs_router)
app.include_router(crm_settings_router)




app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("visitsarva")


if (BUILD_DIR / "static").exists():
    app.mount("/static", StaticFiles(directory=BUILD_DIR / "static"), name="static")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("health") or full_path == "docs" or full_path == "openapi.json":
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    target_dir = _find_build_dir()
    if target_dir.exists():
        file_path = target_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        index_file = target_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    return JSONResponse({"app": "VisitSarva", "tagline": "Buy property, pay no brokerage."})


@app.on_event("startup")
async def on_start():
    try:
        await ensure_seed()
        log.info("Seed complete.")
    except Exception as e:
        log.exception("Seed failed: %s", e)
