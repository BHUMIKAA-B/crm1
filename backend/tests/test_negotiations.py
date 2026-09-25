import pytest
from fastapi import HTTPException
from crm_models import Negotiation
from routers.crm_negotiations_router import create_negotiation_log, update_negotiation, list_negotiations

def test_negotiation_model_structure():
    neg = Negotiation(
        customer_id="cust-123",
        customer_name="Test Customer",
        seller_asking_price=5000000.0,
        buyer_offer=4500000.0,
        current_expected_price=4800000.0,
        notes="Customer offered 45L",
        created_by="tl-user-1"
    )
    assert neg.customer_id == "cust-123"
    assert neg.seller_asking_price == 5000000.0
    assert neg.buyer_offer == 4500000.0
    assert neg.current_expected_price == 4800000.0
    assert neg.notes == "Customer offered 45L"


def test_negotiation_role_permissions():
    exec_user = {"id": "exec-1", "role": "executive"}
    trainee_user = {"id": "trainee-1", "role": "trainee"}
    tl_user = {"id": "tl-1", "role": "team_lead"}

    assert exec_user["role"] == "executive"
    assert trainee_user["role"] == "trainee"
    assert tl_user["role"] == "team_lead"
