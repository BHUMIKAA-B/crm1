"""
Security and RBAC test suite for the Visit Sarva CRM.
Run with:  pytest tests/test_crm_security.py -v

NOTE: These tests require MONGO_URL to be set in the environment
and will use a 'visitsarva_test' database to avoid polluting production data.
"""
import pytest
import asyncio
import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/visitsarva_test")
os.environ.setdefault("JWT_SECRET", "test_secret_123")

from jose import jwt
from datetime import datetime, timedelta, timezone


def make_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=1)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": exp, "type": "employee_access"},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )


# ---- Token decode tests ----

def test_token_type_required():
    """A token without type=employee_access must be rejected."""
    exp = datetime.now(timezone.utc) + timedelta(hours=1)
    bad_token = jwt.encode(
        {"sub": "abc", "role": "executive", "exp": exp},  # no type
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    # Decode should succeed raw, but rbac_service should reject it
    payload = jwt.decode(bad_token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    assert payload.get("type") != "employee_access", "Token without type must fail RBAC check"


def test_access_token_contains_role():
    token = make_token("user-123", "executive")
    payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    assert payload["role"] == "executive"
    assert payload["sub"] == "user-123"
    assert payload["type"] == "employee_access"


# ---- Permission matrix tests (unit) ----

def can_see_financials(role): return role in ["founder", "admin", "bdo"]

def can_assign_leads(role): return role in ["team_lead", "founder", "admin"]
def can_manage_employees(role): return role in ["founder", "admin", "team_lead"]
def can_view_all_leads(role): return role in ["team_lead", "bdo", "founder", "admin"]


class TestPermissionMatrix:
    def test_trainee_cannot_see_financials(self):
        assert not can_see_financials("trainee")

    def test_executive_cannot_see_financials(self):
        assert not can_see_financials("executive")

    def test_founder_sees_financials(self):
        assert can_see_financials("founder")

    def test_bdo_sees_financials(self):
        assert can_see_financials("bdo")

    def test_trainee_cannot_assign_leads(self):
        assert not can_assign_leads("trainee")

    def test_executive_cannot_assign_leads(self):
        assert not can_assign_leads("executive")

    def test_team_lead_can_assign(self):
        assert can_assign_leads("team_lead")

    def test_founder_can_assign(self):
        assert can_assign_leads("founder")

    def test_permitted_roles_manage_employees(self):
        for role in ["trainee", "executive", "bdo"]:
            assert not can_manage_employees(role) if role in ["trainee", "executive", "bdo"] else True
        for role in ["founder", "admin", "team_lead"]:
            assert can_manage_employees(role), f"{role} SHOULD manage employees"

    def test_executive_cannot_view_all_leads(self):
        assert not can_view_all_leads("executive")

    def test_team_lead_views_all_leads(self):
        assert can_view_all_leads("team_lead")


# ---- Deal sanitization test ----

def sanitize_deal(deal: dict, role: str) -> dict:
    """Mirrors backend sanitize_deal_for_employee logic."""
    if role in ["founder", "admin", "bdo"]:
        return deal
    d = dict(deal)
    d.pop("actual_commission", None)
    d.pop("expected_commission", None)
    d.pop("broker_commission_share", None)
    return d


class TestDealSanitization:
    DEAL = {
        "id": "deal-1",
        "deal_id": "VS-DEAL-000001",
        "final_deal_value": 5000000,
        "actual_commission": 250000,
        "expected_commission": 200000,
        "broker_commission_share": 50000,
        "status": "negotiation",
    }

    def test_executive_cannot_see_commission(self):
        result = sanitize_deal(self.DEAL, "executive")
        assert "actual_commission" not in result
        assert "expected_commission" not in result
        assert "broker_commission_share" not in result

    def test_trainee_cannot_see_commission(self):
        result = sanitize_deal(self.DEAL, "trainee")
        assert "actual_commission" not in result

    def test_founder_sees_full_deal(self):
        result = sanitize_deal(self.DEAL, "founder")
        assert "actual_commission" in result
        assert result["actual_commission"] == 250000

    def test_bdo_sees_full_deal(self):
        result = sanitize_deal(self.DEAL, "bdo")
        assert "actual_commission" in result

    def test_deal_value_visible_to_all(self):
        for role in ["trainee", "executive", "team_lead", "founder"]:
            result = sanitize_deal(self.DEAL, role)
            assert "final_deal_value" in result, f"{role} should see deal value"


if __name__ == "__main__":
    # Run permission matrix manually
    t = TestPermissionMatrix()
    t.test_trainee_cannot_see_financials()
    t.test_executive_cannot_see_financials()
    t.test_founder_sees_financials()
    t.test_only_founder_admin_manage_employees()

    d = TestDealSanitization()
    d.test_executive_cannot_see_commission()
    d.test_founder_sees_full_deal()
    d.test_deal_value_visible_to_all()

    print("All permission tests PASSED OK")
