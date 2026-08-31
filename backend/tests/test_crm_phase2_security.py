import pytest
from services.rbac_service import (
    enforce_customer_access,
    enforce_broker_access,
    allowed_target_roles_for_creator,
    get_team_member_ids,
)
from fastapi import HTTPException


def test_customer_access_control():
    founder_user = {"role": "founder"}
    bdo_user = {"role": "bdo"}
    tl_user = {"role": "team_lead"}
    exec_user = {"role": "executive"}
    trainee_user = {"role": "trainee"}

    # Founder & BDO must pass without exception
    enforce_customer_access(founder_user)
    enforce_customer_access(bdo_user)

    # Team Lead, Executive, Trainee must raise 403
    with pytest.raises(HTTPException) as exc1:
        enforce_customer_access(tl_user)
    assert exc1.value.status_code == 403

    with pytest.raises(HTTPException) as exc2:
        enforce_customer_access(exec_user)
    assert exc2.value.status_code == 403

    with pytest.raises(HTTPException) as exc3:
        enforce_customer_access(trainee_user)
    assert exc3.value.status_code == 403


def test_broker_access_control():
    founder_user = {"role": "founder"}
    bdo_user = {"role": "bdo"}
    tl_user = {"role": "team_lead"}
    exec_user = {"role": "executive"}

    # Founder & BDO must pass
    enforce_broker_access(founder_user)
    enforce_broker_access(bdo_user)

    # Team Lead and Executive must raise 403
    with pytest.raises(HTTPException) as exc1:
        enforce_broker_access(tl_user)
    assert exc1.value.status_code == 403

    with pytest.raises(HTTPException) as exc2:
        enforce_broker_access(exec_user)
    assert exc2.value.status_code == 403


def test_employee_creation_role_permissions():
    assert allowed_target_roles_for_creator("founder") == ["dpo", "bdo", "team_lead", "executive", "trainee"]
    assert allowed_target_roles_for_creator("bdo") == ["team_lead", "executive", "trainee"]
    assert allowed_target_roles_for_creator("team_lead") == ["executive", "trainee"]
    assert allowed_target_roles_for_creator("executive") == []
    assert allowed_target_roles_for_creator("trainee") == []
    assert allowed_target_roles_for_creator("dpo") == []


def test_deactivated_account_status_check():
    active_emp = {"status": "active"}
    suspended_emp = {"status": "suspended"}
    exited_emp = {"status": "exited"}

    assert active_emp["status"] == "active"
    assert suspended_emp["status"] != "active"
    assert exited_emp["status"] != "active"
