import asyncio
import types
import pytest

import backend.routers.auth_router as auth_router_module
import backend.auth as auth_utils
import backend.db as db_module


class DummyColl:
    def __init__(self):
        self.store = {}

    async def find_one(self, q, *args, **kwargs):
        # support find by email
        if q.get("email"):
            return self.store.get(q["email"])
        return None

    async def insert_one(self, doc):
        self.store[doc["email"]] = doc

    async def update_one(self, q, upd):
        # return object with matched_count
        class R:
            matched_count = 1

        return R()


class DummyResponse:
    def __init__(self, json_data):
        self._json = json_data

    def raise_for_status(self):
        return None

    def json(self):
        return self._json


@pytest.mark.asyncio
async def test_cognito_callback_creates_user(monkeypatch):
    # Mock token exchange POST
    def fake_post(url, data=None, auth=None, headers=None, timeout=None):
        return DummyResponse({
            "id_token": "fake-id-token",
            "access_token": "fake-access",
            "refresh_token": "fake-refresh",
        })

    monkeypatch.setattr("requests.post", fake_post)

    # Mock verify to return claims
    claims = {
        "email": "test.cognito@example.com",
        "sub": "cognito-sub-123",
        "name": "Cognito User",
        "cognito:groups": ["buyer"],
    }

    async def fake_verify(token):
        return claims

    monkeypatch.setattr(auth_utils, "_verify_cognito_id_token", fake_verify)

    # Replace db.users() with dummy collection
    dummy = DummyColl()
    monkeypatch.setattr(db_module, "users", lambda: dummy)

    # Ensure env vars are set in router context
    monkeypatch.setenv("COGNITO_DOMAIN", "example.auth.region.amazoncognito.com")
    monkeypatch.setenv("COGNITO_CLIENT_ID", "client123")
    monkeypatch.setenv("COGNITO_REDIRECT_URI", "http://localhost:3000/auth/callback")

    # Call the async route handler directly
    resp = await auth_router_module.cognito_callback({"code": "abc"})

    assert "access_token" in resp and "refresh_token" in resp
    assert resp["user"]["email"] == claims["email"]
