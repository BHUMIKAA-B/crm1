"""Tests for Property Loan Enquiry public submission & CRM endpoints."""
import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)


def test_public_loan_enquiry_submission():
    payload = {
        "full_name": "Test Applicant",
        "phone": "9876543210",
        "email": "applicant@example.com",
        "preferred_location": "Whitefield, Bangalore",
        "property_value": "₹75,00,000",
        "loan_amount": "₹60,00,000",
        "employment_type": "Salaried",
        "monthly_income_range": "₹1 Lakh - ₹2 Lakhs",
        "preferred_bank": "State Bank of India (SBI)",
        "message": "Interested in home loan with pre-approval."
    }
    response = client.post("/api/loan-enquiries", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "VS-LOAN-" in data["loan_enquiry_id"]
    assert data["data"]["full_name"] == "Test Applicant"
    assert data["data"]["status"] == "new"


def test_public_loan_enquiry_invalid_phone():
    payload = {
        "full_name": "Test Applicant",
        "phone": "invalid",
        "email": "applicant@example.com",
    }
    response = client.post("/api/loan-enquiries", json=payload)
    assert response.status_code == 422


def test_crm_loan_enquiries_unauthenticated():
    response = client.get("/api/crm/loan-enquiries")
    assert response.status_code in (401, 403)
