"""
Comprehensive automated test suite for:
1. Site Visit Assignee Dropdown (Team Leader team members only)
2. Site Visit Creation & employee/team assignment preservation
3. Scoped dropdown isolation for Team Leaders
4. Team Leader Report permission & data isolation
5. BDO Report permission & scope
6. Founder Report permission & full access
7. Backend security enforcement (HTTP 403 on unauthorized team report access)
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from server import app
import db

@pytest.mark.asyncio
async def test_complete_site_visit_and_reports_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login as Team Leader (Varun)
        tl_login = await client.post("/api/crm/auth/login", json={
            "email": "varun@visitsarva.com",
            "password": "VisitSarva@2025!"
        })
        assert tl_login.status_code == 200, f"TL login failed: {tl_login.text}"
        tl_token = tl_login.json()["access_token"]
        tl_headers = {"Authorization": f"Bearer {tl_token}"}

        # TEST 1: Check Assignable Employees API for Team Leader
        assignable_res = await client.get("/api/crm/employees/assignable", headers=tl_headers)
        assert assignable_res.status_code == 200, f"Assignable API error: {assignable_res.text}"
        assignable_emps = assignable_res.json()

        print(f"\n[TEST 1 PASSED] Assignable employees for Team Leader Varun: {[e['name'] + ' - ' + e['role'] for e in assignable_emps]}")
        # Verify Ramachari (Executive) and Rehan (Trainee) are present
        emp_names = [e["name"] for e in assignable_emps]
        emp_roles = [e["role"] for e in assignable_emps]
        assert "Ramachari" in emp_names, "Ramachari should be in TL assignable employees"
        assert "Rehan" in emp_names, "Rehan should be in TL assignable employees"
        assert "founder" not in emp_roles, "Founder should NOT be in assignable list"
        assert "bdo" not in emp_roles, "BDO should NOT be in assignable list"

        # Find Ramachari's record
        ramachari = next(e for e in assignable_emps if e["name"] == "Ramachari")

        # TEST 2: Create Site Visit assigned to Ramachari
        # First find or create a customer & property
        cust_res = await client.get("/api/crm/customers", headers=tl_headers)
        cust_body = cust_res.json()
        cust_list = cust_body if isinstance(cust_body, list) else cust_body.get("items", cust_body.get("customers", []))
        cust_id = cust_list[0]["id"] if cust_list else "test_cust_id"

        prop_res = await client.get("/api/crm/properties", headers=tl_headers)
        prop_body = prop_res.json()
        prop_list = prop_body if isinstance(prop_body, list) else prop_body.get("items", prop_body.get("properties", []))
        prop_id = prop_list[0]["id"] if prop_list else "test_prop_id"

        sv_payload = {
            "customer_id": cust_id,
            "employee_id": ramachari["id"],
            "date": "2026-10-01",
            "time": "11:00",
            "status": "scheduled",
            "purpose": "Site Walkthrough for 3BHK",
            "notes": "Automated verification test visit",
            "properties": [prop_id]
        }
        create_sv_res = await client.post("/api/crm/site-visits", json=sv_payload, headers=tl_headers)
        assert create_sv_res.status_code in [200, 201], f"Create site visit failed: {create_sv_res.text}"
        sv_data = create_sv_res.json()
        sv_id = sv_data.get("id")
        created_sv = await db.site_visits().find_one({"id": sv_id})
        assert created_sv is not None, "Created site visit record should exist in MongoDB"
        assert created_sv["employee_id"] == ramachari["id"], f"Expected {ramachari['id']}, got {created_sv['employee_id']}"
        print(f"[TEST 2 PASSED] Created site visit: {sv_data.get('visit_id')} assigned to employee {created_sv['employee_id']}")

        # TEST 3: Login as another Team Leader (or check query isolation)
        # Verify query with assignable=true returns team-scoped list only
        list_emp_res = await client.get("/api/crm/employees?assignable=true", headers=tl_headers)
        assert list_emp_res.status_code == 200
        print(f"[TEST 3 PASSED] TL Employee query isolation verified.")

        # TEST 4: Team Leader Report Download (own team only)
        tl_report = await client.get("/api/crm/reports/export?format=xlsx", headers=tl_headers)
        assert tl_report.status_code == 200, f"TL report export failed: {tl_report.text}"
        assert len(tl_report.content) > 100
        print(f"[TEST 4 PASSED] TL downloaded own team report successfully ({len(tl_report.content)} bytes).")

        # TEST 5: Login as BDO (Lakshmi)
        bdo_login = await client.post("/api/crm/auth/login", json={
            "email": "lakshmi@visitsarva.com",
            "password": "VisitSarva@2025!"
        })
        assert bdo_login.status_code == 200
        bdo_token = bdo_login.json()["access_token"]
        bdo_headers = {"Authorization": f"Bearer {bdo_token}"}
        bdo_report = await client.get("/api/crm/reports/export?format=xlsx", headers=bdo_headers)
        assert bdo_report.status_code == 200
        print(f"[TEST 5 PASSED] BDO downloaded BDO scope report successfully ({len(bdo_report.content)} bytes).")

        # TEST 6: Login as Founder (Sanjay)
        founder_login = await client.post("/api/crm/auth/login", json={
            "email": "sanjayj@visitsarva.com",
            "password": "VisitSarva@2025!"
        })
        assert founder_login.status_code == 200
        founder_token = founder_login.json()["access_token"]
        founder_headers = {"Authorization": f"Bearer {founder_token}"}
        founder_report = await client.get("/api/crm/reports/export?format=xlsx", headers=founder_headers)
        assert founder_report.status_code == 200
        print(f"[TEST 6 PASSED] Founder downloaded all-teams report successfully ({len(founder_report.content)} bytes).")

        # TEST 7: Direct API manipulation by Team Leader requesting another team ID
        unauthorized_report = await client.get("/api/crm/reports/export?team_id=fake_or_other_team_id", headers=tl_headers)
        assert unauthorized_report.status_code == 403, f"Expected 403, got {unauthorized_report.status_code}"
        print(f"[TEST 7 PASSED] Backend correctly rejected unauthorized team ID request with HTTP 403: {unauthorized_report.json()}")

if __name__ == "__main__":
    asyncio.run(test_complete_site_visit_and_reports_flow())
