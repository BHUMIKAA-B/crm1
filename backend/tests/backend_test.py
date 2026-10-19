"""VisitSarva backend integration tests.

Covers: auth (register/login/refresh/me), public properties (list/featured/detail),
seller CRUD, admin verify/reject/stats, enquiries, services, AI listing & smart
search, and buyer saved properties.
"""
from __future__ import annotations

import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    if os.path.exists("/app/frontend/.env"):
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    if not BASE_URL:
        BASE_URL = "http://localhost:8000"

API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@visitsarva.in", "password": "VisitSarva@2025"}
SELLER = {"email": "demo.seller@visitsarva.in", "password": "Demo@2025"}
BUYER = {"email": "demo.buyer@visitsarva.in", "password": "Demo@2025"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def session():
    return requests.Session()


def _login(session, creds):
    r = session.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"], data.get("refresh_token"), data["user"]


@pytest.fixture(scope="session")
def admin_token(session):
    tok, _, _ = _login(session, ADMIN)
    return tok


@pytest.fixture(scope="session")
def seller_token(session):
    tok, _, _ = _login(session, SELLER)
    return tok


@pytest.fixture(scope="session")
def buyer_creds(session):
    tok, refresh, user = _login(session, BUYER)
    return {"token": tok, "refresh": refresh, "user": user}


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_register_buyer(self, session):
        email = f"TEST_buyer_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={
            "name": "Test Buyer", "email": email, "phone": "9999999999",
            "password": "Test@1234", "role": "buyer",
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"].lower() == email.lower()
        assert d["user"]["role"] == "buyer"
        assert d["access_token"] and d["refresh_token"]

    def test_register_seller(self, session):
        email = f"TEST_seller_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={
            "name": "Test Seller", "email": email, "phone": "9999999998",
            "password": "Test@1234", "role": "seller",
        }, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "seller"

    def test_register_admin_rejected(self, session):
        email = f"TEST_admin_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={
            "name": "X", "email": email, "phone": "1", "password": "Test@1234",
            "role": "admin",
        }, timeout=30)
        assert r.status_code == 400

    def test_login_admin(self, session):
        tok, _, user = _login(session, ADMIN)
        assert user["role"] == "admin"
        assert tok

    def test_login_seller(self, session):
        _, _, user = _login(session, SELLER)
        assert user["role"] == "seller"

    def test_login_buyer(self, session):
        _, _, user = _login(session, BUYER)
        assert user["role"] == "buyer"

    def test_login_bad_password(self, session):
        r = session.post(f"{API}/auth/login", json={
            "email": ADMIN["email"], "password": "wrongpass"}, timeout=30)
        assert r.status_code == 401

    def test_me(self, session, buyer_creds):
        r = session.get(f"{API}/auth/me", headers=auth_h(buyer_creds["token"]), timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == BUYER["email"]

    def test_refresh_token(self, session, buyer_creds):
        r = session.post(f"{API}/auth/refresh-token",
                         json={"refresh_token": buyer_creds["refresh"]}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("access_token")


# ---------------- Public Properties ----------------
class TestPublicProperties:
    def test_list(self, session):
        r = session.get(f"{API}/properties", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d
        assert isinstance(d["items"], list)
        assert d["total"] >= 1, "Expected seeded published properties"

    def test_list_filters(self, session):
        r = session.get(f"{API}/properties",
                        params={"category": "apartment", "city": "Bangalore",
                                "min_price": 1000000, "max_price": 100000000,
                                "sort_by": "price_asc"},
                        timeout=30)
        assert r.status_code == 200
        items = r.json()["items"]
        for it in items:
            assert it["category"] == "apartment"
            assert "bangalore" in it.get("location", {}).get("city", "").lower()

    def test_featured(self, session):
        r = session.get(f"{API}/properties/featured", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_detail_and_404(self, session):
        lst = session.get(f"{API}/properties", timeout=30).json()["items"]
        assert lst
        pid = lst[0]["id"]
        r = session.get(f"{API}/properties/{pid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == pid
        r2 = session.get(f"{API}/properties/nonexistent-xyz", timeout=30)
        assert r2.status_code == 404


# ---------------- Seller ----------------
@pytest.fixture(scope="session")
def created_listing(session, seller_token):
    payload = {
        "title": "TEST_Listing_Pytest",
        "description": "Pytest created listing",
        "category": "apartment",
        "price": 5500000,
        "price_negotiable": True,
        "location": {"address": "Test St", "city": "Bangalore", "state": "KA", "pincode": "560001"},
        "area": {"size": 1200, "unit": "sqft"},
        "bedrooms": 2, "bathrooms": 2,
        "amenities": ["Lift"], "features": [], "images": [], "documents": [],
    }
    r = session.post(f"{API}/seller/properties", json=payload,
                     headers=auth_h(seller_token), timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


class TestSeller:
    def test_create_listing(self, created_listing, seller_token):
        d = created_listing
        assert d["status"] == "pending_verification"
        assert d["listed_by"]
        assert d["listed_by_name"]
        assert d["id"]

    def test_list_my_listings(self, session, seller_token, created_listing):
        r = session.get(f"{API}/seller/properties", headers=auth_h(seller_token), timeout=30)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert created_listing["id"] in ids

    def test_update_listing(self, session, seller_token, created_listing):
        r = session.put(f"{API}/seller/properties/{created_listing['id']}",
                        json={"price": 6000000}, headers=auth_h(seller_token), timeout=30)
        assert r.status_code == 200
        # Verify persistence via seller fetch
        g = session.get(f"{API}/seller/properties/{created_listing['id']}",
                        headers=auth_h(seller_token), timeout=30)
        assert g.status_code == 200
        body = g.json()
        assert body["price"] == 6000000
        assert body["status"] == "pending_verification"

    def test_buyer_cannot_create(self, session, buyer_creds):
        r = session.post(f"{API}/seller/properties", json={
            "title": "x", "category": "apartment", "price": 1,
            "location": {}, "area": {"size": 1, "unit": "sqft"},
        }, headers=auth_h(buyer_creds["token"]), timeout=30)
        assert r.status_code == 403


# ---------------- Admin ----------------
class TestAdmin:
    def test_buyer_blocked(self, session, buyer_creds):
        r = session.get(f"{API}/admin/dashboard/stats",
                        headers=auth_h(buyer_creds["token"]), timeout=30)
        assert r.status_code == 403

    def test_seller_blocked(self, session, seller_token):
        r = session.get(f"{API}/admin/properties/pending",
                        headers=auth_h(seller_token), timeout=30)
        assert r.status_code == 403

    def test_stats(self, session, admin_token):
        r = session.get(f"{API}/admin/dashboard/stats",
                        headers=auth_h(admin_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["pending_listings", "published_listings", "users_total",
                  "buyers", "sellers", "enquiries", "service_requests"]:
            assert k in d
            assert isinstance(d[k], int)

    def test_pending_queue(self, session, admin_token, created_listing):
        r = session.get(f"{API}/admin/properties/pending",
                        headers=auth_h(admin_token), timeout=30)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert created_listing["id"] in ids

    def test_verify(self, session, admin_token, created_listing):
        r = session.put(f"{API}/admin/properties/{created_listing['id']}/verify",
                        json={"notes": "ok"}, headers=auth_h(admin_token), timeout=30)
        assert r.status_code == 200
        # Confirm published via public detail
        pub = session.get(f"{API}/properties/{created_listing['id']}", timeout=30)
        assert pub.status_code == 200
        assert pub.json()["status"] == "published"

    def test_reject_flow(self, session, admin_token, seller_token):
        # Create a fresh listing to reject
        payload = {
            "title": "TEST_Reject_Me", "category": "apartment", "price": 100000,
            "location": {"address": "a", "city": "Bangalore", "state": "KA", "pincode": "560001"},
            "area": {"size": 500, "unit": "sqft"}, "bedrooms": 1,
            "amenities": [], "features": [], "images": [], "documents": [],
        }
        c = session.post(f"{API}/seller/properties", json=payload,
                         headers=auth_h(seller_token), timeout=30)
        pid = c.json()["id"]
        r = session.put(f"{API}/admin/properties/{pid}/reject",
                        json={"reason": "Test rejection"},
                        headers=auth_h(admin_token), timeout=30)
        assert r.status_code == 200
        # Public detail should now 404 since status=rejected
        pub = session.get(f"{API}/properties/{pid}", timeout=30)
        assert pub.status_code == 404


# ---------------- Enquiries ----------------
class TestEnquiries:
    def test_create_anonymous(self, session):
        lst = session.get(f"{API}/properties", timeout=30).json()["items"]
        pid = lst[0]["id"]
        before = session.get(f"{API}/properties/{pid}", timeout=30).json().get("enquiries", 0)
        r = session.post(f"{API}/enquiries", json={
            "property_id": pid, "name": "TEST_A", "email": "a@test.com",
            "phone": "1234567890", "message": "interested",
            "contact_preference": "email",
        }, timeout=30)
        assert r.status_code == 200, r.text
        # GET to verify counter incremented
        after = session.get(f"{API}/properties/{pid}", timeout=30).json().get("enquiries", 0)
        assert after >= before + 1

    def test_create_unknown_404(self, session):
        r = session.post(f"{API}/enquiries", json={
            "property_id": "does-not-exist", "name": "x", "email": "x@x.com",
            "phone": "0", "message": "", "contact_preference": "call",
        }, timeout=30)
        assert r.status_code == 404


# ---------------- Services ----------------
class TestServices:
    def test_create_and_my(self, session, buyer_creds):
        r = session.post(f"{API}/services", json={
            "request_type": "khata_assistance", "address": "Test Addr",
            "description": "test", "name": "TEST_Buyer",
            "email": "TEST_buy@example.com", "phone": "9999999990",
        }, headers=auth_h(buyer_creds["token"]), timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["request_type"] == "khata_assistance"

        my = session.get(f"{API}/services/my",
                        headers=auth_h(buyer_creds["token"]), timeout=30)
        assert my.status_code == 200
        assert any(x["request_type"] == "khata_assistance" for x in my.json())

    def test_my_requires_auth(self, session):
        r = session.get(f"{API}/services/my", timeout=30)
        assert r.status_code in (401, 403)


# ---------------- Buyer saved props ----------------
class TestSaved:
    def test_save_unsave_flow(self, session, buyer_creds):
        lst = session.get(f"{API}/properties", timeout=30).json()["items"]
        pid = lst[0]["id"]
        r1 = session.post(f"{API}/users/me/saved/{pid}",
                          headers=auth_h(buyer_creds["token"]), timeout=30)
        assert r1.status_code == 200
        saved = session.get(f"{API}/users/me/saved",
                            headers=auth_h(buyer_creds["token"]), timeout=30)
        assert saved.status_code == 200
        assert any(x["id"] == pid for x in saved.json())
        r2 = session.delete(f"{API}/users/me/saved/{pid}",
                            headers=auth_h(buyer_creds["token"]), timeout=30)
        assert r2.status_code == 200
        saved2 = session.get(f"{API}/users/me/saved",
                             headers=auth_h(buyer_creds["token"]), timeout=30)
        assert all(x["id"] != pid for x in saved2.json())


# ---------------- AI ----------------
class TestAI:
    def test_smart_search(self, session):
        r = session.post(f"{API}/ai/smart-search",
                         json={"query": "apartment in Bangalore under 2 crore"},
                         timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "summary" in d and "filters" in d and "results" in d and "count" in d
        assert isinstance(d["results"], list)
        assert d["count"] == len(d["results"])

    def test_listing_assistant(self, session):
        r = session.post(f"{API}/ai/listing-assistant", json={
            "session_id": f"test-{uuid.uuid4().hex[:8]}",
            "message": ("I want to list a 3 BHK apartment in Whitefield Bangalore, "
                        "1850 sqft, asking 1.45 crore"),
            "history": [],
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and "extracted" in d
        assert isinstance(d["extracted"], dict)
        # Must contain at least title or category
        assert d["extracted"].get("title") or d["extracted"].get("category"), \
            f"extracted lacks title/category: {d['extracted']}"
