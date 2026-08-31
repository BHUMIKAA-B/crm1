"""Database connection and collection accessors for VisitSarva."""
from __future__ import annotations

import logging
import os
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient

log = logging.getLogger("visitsarva")

_client: AsyncIOMotorClient | None = None
_db = None


def _resolve_db_name() -> str:
    """Return DB name from DB_NAME env var, MONGO_URL path, or default."""
    if os.environ.get("DB_NAME"):
        return os.environ["DB_NAME"]
    mongo_url = os.environ.get("MONGO_URL", "")
    if mongo_url:
        path = urlparse(mongo_url).path.lstrip("/")
        if path:
            return path.split("?")[0] or "visitsarva"
    return "visitsarva"


def get_db():
    global _client, _db
    if _db is None:
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017/visitsarva")
        try:
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=1500)
            import pymongo
            sync_test = pymongo.MongoClient(mongo_url, serverSelectionTimeoutMS=1500)
            sync_test.admin.command("ping")
            _client = client
            _db = _client[_resolve_db_name()]
            log.info("Connected to MongoDB at %s", mongo_url)
        except Exception as e:
            log.warning("Standalone MongoDB not connected (%s). Initialising in-memory database mock fallback.", e)
            from mock_db import AsyncDatabaseMock
            _db = AsyncDatabaseMock(_resolve_db_name())
    return _db


def users():
    return get_db()["users"]


def properties():
    return get_db()["properties"]


def enquiries():
    return get_db()["enquiries"]


def service_requests():
    return get_db()["service_requests"]


def notifications():
    return get_db()["notifications"]


def brochure_downloads():
    return get_db()["brochure_downloads"]


def project_enquiries():
    return get_db()["project_enquiries"]


# CRM Collections
def employees():
    return get_db()["employees"]


def leads():
    return get_db()["leads"]


def customers():
    return get_db()["customers"]


def requirements():
    return get_db()["requirements"]


def tasks():
    return get_db()["tasks"]


def audit_logs():
    return get_db()["audit_logs"]


def timeline_events():
    return get_db()["timeline_events"]


def owners():
    return get_db()["owners"]


def brokers():
    return get_db()["brokers"]


def site_visits():
    return get_db()["site_visits"]


def deals():
    return get_db()["deals"]


def negotiations():
    return get_db()["negotiations"]


def property_shares():
    return get_db()["property_shares"]


def crm_documents():
    return get_db()["crm_documents"]


def payments():
    return get_db()["payments"]


def commissions():
    return get_db()["commissions"]


def crm_notifications():
    return get_db()["crm_notifications"]


def crm_settings():
    return get_db()["crm_settings"]


def teams():
    return get_db()["teams"]


