"""VisitSarva iteration 3 backend tests.

Covers: Hero CMS (GET/PUT), Projects CRUD with filters, Construction enquiry,
Property Valuation lead, Notifications, and admin-verify -> seller notification
push integration.
"""
from __future__ import annotations

import os
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


# -------- Fixtures --------
@pytest.fixture(scope="module")
def s():
    return requests.Session()


def _login(s, creds):
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def admin_tok(s):
    return _login(s, ADMIN)["access_token"]


@pytest.fixture(scope="module")
def seller_data(s):
    d = _login(s, SELLER)
    return {"tok": d["access_token"], "user": d["user"]}


@pytest.fixture(scope="module")
def buyer_tok(s):
    return _login(s, BUYER)["access_token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# -------- Hero CMS --------
class TestHero:
    def test_get_hero_public(self, s):
        r = s.get(f"{API}/hero", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["image_url", "headline", "sub_headline", "cta_text", "cta_link"]:
            assert k in d, f"hero missing {k}"
        assert d["headline"]
        assert d["cta_link"]

    def test_put_hero_blocked_buyer(self, s, buyer_tok):
        r = s.put(f"{API}/hero", json={"headline": "X"}, headers=H(buyer_tok), timeout=30)
        assert r.status_code == 403

    def test_put_hero_blocked_seller(self, s, seller_data):
        r = s.put(f"{API}/hero", json={"headline": "X"}, headers=H(seller_data["tok"]), timeout=30)
        assert r.status_code == 403

    def test_put_hero_admin_updates_and_persists(self, s, admin_tok):
        new_head = f"TEST_Headline_{uuid.uuid4().hex[:6]}"
        r = s.put(
            f"{API}/hero",
            json={"headline": new_head, "sub_headline": "TEST sub", "cta_text": "Go"},
            headers=H(admin_tok), timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json()["headline"] == new_head
        # GET to verify persistence
        g = s.get(f"{API}/hero", timeout=30).json()
        assert g["headline"] == new_head
        assert g["sub_headline"] == "TEST sub"


# -------- Projects --------
class TestProjects:
    def test_list_all(self, s):
        r = s.get(f"{API}/projects", timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 6, f"expected >=6 seeded projects, got {len(items)}"

    def test_filter_new(self, s):
        r = s.get(f"{API}/projects", params={"type": "new"}, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3
        for it in items:
            assert it["status"] == "new"

    def test_filter_active(self, s):
        r = s.get(f"{API}/projects", params={"type": "active"}, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3
        for it in items:
            assert it["status"] == "active"

    def test_filter_sector_commercial(self, s):
        r = s.get(f"{API}/projects", params={"sector": "commercial"}, timeout=30)
        assert r.status_code == 200
        for it in r.json():
            assert it["sector"] == "commercial"

    def test_get_unknown_404(self, s):
        r = s.get(f"{API}/projects/no-such-id", timeout=30)
        assert r.status_code == 404

    def test_get_one(self, s):
        items = s.get(f"{API}/projects", timeout=30).json()
        pid = items[0]["id"]
        r = s.get(f"{API}/projects/{pid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_create_blocked_buyer(self, s, buyer_tok):
        payload = {"title": "TEST_proj", "sector": "commercial", "status": "new"}
        r = s.post(f"{API}/projects", json=payload, headers=H(buyer_tok), timeout=30)
        assert r.status_code == 403

    def test_create_blocked_seller(self, s, seller_data):
        payload = {"title": "TEST_proj", "sector": "commercial", "status": "new"}
        r = s.post(f"{API}/projects", json=payload, headers=H(seller_data["tok"]), timeout=30)
        assert r.status_code == 403

    def test_admin_crud_full(self, s, admin_tok):
        payload = {
            "title": f"TEST_Proj_{uuid.uuid4().hex[:6]}",
            "description": "test desc",
            "sector": "commercial",
            "location": "Whitefield",
            "city": "Bangalore",
            "price_range": "1Cr-2Cr",
            "area": "1500 sqft",
            "image_url": "https://example.com/i.jpg",
            "status": "new",
            "builder": "TEST Builder",
            "possession": "2026",
            "rera_id": "RERA/TEST/1",
            "is_featured": True,
        }
        c = s.post(f"{API}/projects", json=payload, headers=H(admin_tok), timeout=30)
        assert c.status_code == 200, c.text
        created = c.json()
        assert created["id"]
        assert created["title"] == payload["title"]
        pid = created["id"]

        # GET verify persisted
        g = s.get(f"{API}/projects/{pid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["title"] == payload["title"]

        # PUT update
        payload["title"] = payload["title"] + "_upd"
        u = s.put(f"{API}/projects/{pid}", json=payload, headers=H(admin_tok), timeout=30)
        assert u.status_code == 200
        g2 = s.get(f"{API}/projects/{pid}", timeout=30).json()
        assert g2["title"].endswith("_upd")

        # DELETE
        d = s.delete(f"{API}/projects/{pid}", headers=H(admin_tok), timeout=30)
        assert d.status_code == 200
        g3 = s.get(f"{API}/projects/{pid}", timeout=30)
        assert g3.status_code == 404


# -------- Construction enquiry --------
class TestConstructionEnquiry:
    def test_create_anonymous(self, s, admin_tok):
        payload = {
            "name": "TEST_Contractor",
            "phone": "9000000001",
            "email": "test_cons@example.com",
            "location": "HSR Layout, Bangalore",
            "land_size": "30x40",
            "construction_type": "new_construction",
            "notes": "Need a 3-storey villa",
        }
        r = s.post(f"{API}/enquiry", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["request_type"] == "construction"
        assert d["name"] == "TEST_Contractor"
        assert d["id"]
        # Verify it shows up in admin service-requests
        adm = s.get(f"{API}/admin/service-requests", headers=H(admin_tok), timeout=30)
        assert adm.status_code == 200
        ids = [x["id"] for x in adm.json()]
        assert d["id"] in ids

    def test_missing_required_fields(self, s):
        # missing phone
        r = s.post(f"{API}/enquiry", json={"name": "x", "location": "y"}, timeout=30)
        assert r.status_code == 422


# -------- Valuation lead --------
class TestValuation:
    def test_create_valuation(self, s, admin_tok):
        r = s.post(f"{API}/valuation", json={
            "name": "TEST_Valuer",
            "phone": "9000000002",
            "address": "Indiranagar, Bangalore",
            "property_type": "residential",
        }, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["request_type"] == "property_valuation"
        assert d["notes"] == "Source: hero lead-magnet"
        assert d["address"] == "Indiranagar, Bangalore"
        # Verify in admin queue
        adm = s.get(f"{API}/admin/service-requests", headers=H(admin_tok), timeout=30)
        ids = [x["id"] for x in adm.json()]
        assert d["id"] in ids

    def test_missing_fields(self, s):
        r = s.post(f"{API}/valuation", json={"name": "only"}, timeout=30)
        assert r.status_code == 422


# -------- Notifications --------
class TestNotifications:
    def test_requires_auth(self, s):
        r = s.get(f"{API}/notifications", timeout=30)
        assert r.status_code in (401, 403)

    def test_list_empty_or_array(self, s, buyer_tok):
        r = s.get(f"{API}/notifications", headers=H(buyer_tok), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_mark_all_read(self, s, buyer_tok):
        r = s.put(f"{API}/notifications/read-all", headers=H(buyer_tok), timeout=30)
        assert r.status_code == 200


# -------- Integration: admin verify -> seller notification --------
class TestAdminVerifyNotificationIntegration:
    def test_seller_notified_on_verify(self, s, seller_data, admin_tok):
        seller_tok = seller_data["tok"]
        # 1) Snapshot notifications count for seller
        before = s.get(f"{API}/notifications", headers=H(seller_tok), timeout=30).json()
        before_count = len(before)

        # 2) Create a fresh pending listing
        payload = {
            "title": f"TEST_NotifListing_{uuid.uuid4().hex[:6]}",
            "description": "notif integration",
            "category": "apartment",
            "price": 4500000,
            "price_negotiable": False,
            "location": {"address": "Notif St", "city": "Bangalore",
                         "state": "KA", "pincode": "560001"},
            "area": {"size": 900, "unit": "sqft"},
            "bedrooms": 2, "bathrooms": 1,
            "amenities": [], "features": [], "images": [], "documents": [],
        }
        c = s.post(f"{API}/seller/properties", json=payload,
                   headers=H(seller_tok), timeout=30)
        assert c.status_code == 200, c.text
        pid = c.json()["id"]

        # 3) Admin verifies it
        v = s.put(f"{API}/admin/properties/{pid}/verify",
                  json={"notes": "ok"}, headers=H(admin_tok), timeout=30)
        assert v.status_code == 200

        # 4) Seller fetches notifications -- count must increase
        after = s.get(f"{API}/notifications", headers=H(seller_tok), timeout=30).json()
        assert len(after) >= before_count + 1, (
            f"expected new notification after verify; before={before_count} after={len(after)}"
        )
        # link should be /properties/{pid}
        new_notifs = after[: len(after) - before_count]
        assert any(pid in (n.get("link") or "") for n in new_notifs), (
            f"no notification linking to {pid} in {new_notifs}"
        )

        # 5) Mark single read works
        target = new_notifs[0]
        mr = s.put(f"{API}/notifications/{target['id']}/read",
                   headers=H(seller_tok), timeout=30)
        assert mr.status_code == 200


# -------- Integration: buyer enquiry pushes seller notification --------
class TestEnquiryNotifies:
    def test_seller_notified_on_enquiry(self, s, seller_data, admin_tok):
        seller_tok = seller_data["tok"]
        # Create + verify a listing first
        payload = {
            "title": f"TEST_EnqNotif_{uuid.uuid4().hex[:6]}",
            "description": "enq notif",
            "category": "apartment",
            "price": 3000000,
            "location": {"address": "a", "city": "Bangalore",
                         "state": "KA", "pincode": "560001"},
            "area": {"size": 800, "unit": "sqft"},
            "bedrooms": 1, "bathrooms": 1,
            "amenities": [], "features": [], "images": [], "documents": [],
        }
        c = s.post(f"{API}/seller/properties", json=payload,
                   headers=H(seller_tok), timeout=30)
        pid = c.json()["id"]
        s.put(f"{API}/admin/properties/{pid}/verify", json={"notes": "ok"},
              headers=H(admin_tok), timeout=30)

        before = s.get(f"{API}/notifications", headers=H(seller_tok), timeout=30).json()
        before_count = len(before)

        # Buyer (anonymous) sends enquiry
        e = s.post(f"{API}/enquiries", json={
            "property_id": pid, "name": "TEST_EnqBuyer",
            "email": "eb@test.com", "phone": "9000000003",
            "message": "interested", "contact_preference": "email",
        }, timeout=30)
        assert e.status_code == 200, e.text

        after = s.get(f"{API}/notifications", headers=H(seller_tok), timeout=30).json()
        assert len(after) >= before_count + 1, "seller should be notified of new enquiry"
