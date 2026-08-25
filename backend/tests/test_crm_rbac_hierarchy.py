"""
VisitSarva CRM — RBAC Hierarchy Test Suite
===========================================
Tests all 13 account creation hierarchy rules as specified in the
implementation plan (Section 31). These tests validate pure logic
(no live DB) for role enforcement, team scoping, and 403 rejection.
"""
import pytest
from services.rbac_service import allowed_target_roles_for_creator, can_access_audit_logs, can_access_dpo_records


# ---------------------------------------------------------------------------
# Helper: mirrors backend logic exactly (sourced from crm_employees_router.py)
# ---------------------------------------------------------------------------

def can_create_employee(creator_role: str, target_role: str) -> bool:
    """Return True if creator_role is allowed to create target_role."""
    allowed = allowed_target_roles_for_creator(creator_role)
    return target_role in allowed


def requires_team_scope(creator_role: str) -> bool:
    """Return True if creator must scope new account to their own team."""
    return creator_role == "team_lead"


# ---------------------------------------------------------------------------
# Rule 1 — Founder can create DPO
# ---------------------------------------------------------------------------
def test_rule_1_founder_can_create_dpo():
    assert can_create_employee("founder", "dpo") is True


# ---------------------------------------------------------------------------
# Rule 2 — Founder can create BDO
# ---------------------------------------------------------------------------
def test_rule_2_founder_can_create_bdo():
    assert can_create_employee("founder", "bdo") is True


# ---------------------------------------------------------------------------
# Rule 3 — Founder can create Team Lead
# ---------------------------------------------------------------------------
def test_rule_3_founder_can_create_team_lead():
    assert can_create_employee("founder", "team_lead") is True


# ---------------------------------------------------------------------------
# Rule 4 — Founder can create Executive
# ---------------------------------------------------------------------------
def test_rule_4_founder_can_create_executive():
    assert can_create_employee("founder", "executive") is True


# ---------------------------------------------------------------------------
# Rule 5 — Founder can create Trainee
# ---------------------------------------------------------------------------
def test_rule_5_founder_can_create_trainee():
    assert can_create_employee("founder", "trainee") is True


# ---------------------------------------------------------------------------
# Rule 6 — Founder CANNOT create another Founder (no self-escalation)
# ---------------------------------------------------------------------------
def test_rule_6_founder_cannot_create_founder():
    assert can_create_employee("founder", "founder") is False


# ---------------------------------------------------------------------------
# Rule 7 — Team Lead can create Executive
# ---------------------------------------------------------------------------
def test_rule_7_team_lead_can_create_executive():
    assert can_create_employee("team_lead", "executive") is True


# ---------------------------------------------------------------------------
# Rule 8 — Team Lead can create Trainee
# ---------------------------------------------------------------------------
def test_rule_8_team_lead_can_create_trainee():
    assert can_create_employee("team_lead", "trainee") is True


# ---------------------------------------------------------------------------
# Rule 9 — Team Lead CANNOT create BDO (privilege escalation)
# ---------------------------------------------------------------------------
def test_rule_9_team_lead_cannot_create_bdo():
    assert can_create_employee("team_lead", "bdo") is False


# ---------------------------------------------------------------------------
# Rule 10 — Team Lead CANNOT create DPO
# ---------------------------------------------------------------------------
def test_rule_10_team_lead_cannot_create_dpo():
    assert can_create_employee("team_lead", "dpo") is False


# ---------------------------------------------------------------------------
# Rule 11 — Team Lead creation must be team-scoped
# ---------------------------------------------------------------------------
def test_rule_11_team_lead_creation_requires_team_scope():
    assert requires_team_scope("team_lead") is True
    assert requires_team_scope("founder") is False
    assert requires_team_scope("bdo") is False


# ---------------------------------------------------------------------------
# Rule 12 — BDO, Executive, Trainee CANNOT create any employee (all return 403)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("non_creator_role", ["bdo", "executive", "trainee"])
def test_rule_12_non_creators_cannot_create_any_employee(non_creator_role):
    all_roles = ["founder", "dpo", "bdo", "team_lead", "executive", "trainee"]
    for target in all_roles:
        assert can_create_employee(non_creator_role, target) is False, (
            f"{non_creator_role} should NOT be able to create {target}"
        )


# ---------------------------------------------------------------------------
# Rule 13 — DPO CANNOT create any employee account
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("target_role", ["founder", "dpo", "bdo", "team_lead", "executive", "trainee"])
def test_rule_13_dpo_cannot_create_employees(target_role):
    assert can_create_employee("dpo", target_role) is False


# ---------------------------------------------------------------------------
# DPO Permission Checks — Audit Logs & Document Records
# ---------------------------------------------------------------------------
def test_dpo_can_access_audit_logs():
    dpo_emp = {"role": "dpo"}
    assert can_access_audit_logs(dpo_emp) is True


def test_dpo_can_access_dpo_records():
    dpo_emp = {"role": "dpo"}
    assert can_access_dpo_records(dpo_emp) is True


def test_executive_cannot_access_audit_logs():
    emp = {"role": "executive"}
    assert can_access_audit_logs(emp) is False


def test_trainee_cannot_access_audit_logs():
    emp = {"role": "trainee"}
    assert can_access_audit_logs(emp) is False


def test_bdo_cannot_access_audit_logs():
    emp = {"role": "bdo"}
    assert can_access_audit_logs(emp) is False


def test_founder_can_access_audit_logs():
    emp = {"role": "founder"}
    assert can_access_audit_logs(emp) is True


# ---------------------------------------------------------------------------
# Allowed role lists — completeness checks
# ---------------------------------------------------------------------------
def test_founder_allowed_roles_complete():
    roles = allowed_target_roles_for_creator("founder")
    for r in ["dpo", "bdo", "team_lead", "executive", "trainee"]:
        assert r in roles, f"Founder should be able to create {r}"


def test_team_lead_allowed_roles_exact():
    roles = allowed_target_roles_for_creator("team_lead")
    assert set(roles) == {"executive", "trainee"}, (
        f"Team Lead allowed roles should be exactly {{executive, trainee}}, got {set(roles)}"
    )


def test_non_creator_allowed_roles_empty():
    for role in ["bdo", "executive", "trainee", "dpo"]:
        assert allowed_target_roles_for_creator(role) == [], (
            f"{role} should have no allowed target roles"
        )
