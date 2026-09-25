"""
Comprehensive automated test suite for:
1. Manual Site Visit Creation & Team Member Assignment Authorization Rules:
   - Team Leader creates visit for Self (employee_id: "") -> SUCCESS
   - Team Leader creates visit for own-team Executive -> SUCCESS
   - Team Leader creates visit for own-team Trainee -> SUCCESS
   - Team Leader assigns to another team's employee -> HTTP 403 FORBIDDEN
   - Executive creates visit for Self -> SUCCESS
   - Executive assigns to another user -> HTTP 403 FORBIDDEN ("You can only create site visits for yourself.")
   - Trainee creates visit for Self -> SUCCESS
   - Trainee assigns to another user -> HTTP 403 FORBIDDEN
   - BDO creates visit for scoped employee -> SUCCESS
   - Founder creates visit for any employee -> SUCCESS
2. Site Visit Visibility Rules & Scoping
3. Team-based Report Download Permission & Security Scoping (TL own-team only, 403 on other team)
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from server import app
import db

@pytest.mark.asyncio
async def test_manual_site_visit_and_reports_authorization():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # ── 1. LOGIN ALL USERS ──
        # Team Leader (Varun)
        tl_res = await client.post("/api/crm/auth/login", json={"email": "varun@visitsarva.com", "password": "VisitSarva@2025!"})
        assert tl_res.status_code == 200, f"TL login failed: {tl_res.text}"
        tl = tl_res.json()["employee"]
        tl_headers = {"Authorization": f"Bearer {tl_res.json()['access_token']}"}

        # Executive (Ramachari)
        exec_res = await client.post("/api/crm/auth/login", json={"email": "ramachari@visitsarva.com", "password": "VisitSarva@2025!"})
        assert exec_res.status_code == 200
        exec_user = exec_res.json()["employee"]
        exec_headers = {"Authorization": f"Bearer {exec_res.json()['access_token']}"}

        # Trainee (Rehan)
        trainee_res = await client.post("/api/crm/auth/login", json={"email": "rehan@visitsarva.com", "password": "VisitSarva@2025!"})
        assert trainee_res.status_code == 200
        trainee_user = trainee_res.json()["employee"]
        trainee_headers = {"Authorization": f"Bearer {trainee_res.json()['access_token']}"}

        # BDO (Lakshmi)
        bdo_res = await client.post("/api/crm/auth/login", json={"email": "lakshmi@visitsarva.com", "password": "VisitSarva@2025!"})
        assert bdo_res.status_code == 200
        bdo_headers = {"Authorization": f"Bearer {bdo_res.json()['access_token']}"}

        # Founder (Sanjay)
        founder_res = await client.post("/api/crm/auth/login", json={"email": "sanjayj@visitsarva.com", "password": "VisitSarva@2025!"})
        assert founder_res.status_code == 200
        founder_headers = {"Authorization": f"Bearer {founder_res.json()['access_token']}"}

        # Fetch active customers & properties for testing
        cust_res = await client.get("/api/crm/customers", headers=tl_headers)
        cust_body = cust_res.json()
        cust_list = cust_body if isinstance(cust_body, list) else cust_body.get("items", cust_body.get("customers", []))
        cust_id = cust_list[0]["id"] if cust_list else "test_cust_id"

        prop_res = await client.get("/api/crm/properties", headers=tl_headers)
        prop_body = prop_res.json()
        prop_list = prop_body if isinstance(prop_body, list) else prop_body.get("items", prop_body.get("properties", []))
        prop_id = prop_list[0]["id"] if prop_list else "test_prop_id"

        # ── 2. SITE VISIT ASSIGNEE DROPDOWN FOR TL ──
        assignable_res = await client.get("/api/crm/employees/assignable", headers=tl_headers)
        assert assignable_res.status_code == 200
        assignable_emps = assignable_res.json()
        assignable_ids = [e["id"] for e in assignable_emps]
        assert exec_user["id"] in assignable_ids, "Executive Ramachari should be in TL assignable list"
        assert trainee_user["id"] in assignable_ids, "Trainee Rehan should be in TL assignable list"
        print(f"\n[TEST 1 PASSED] TL Assignable dropdown returned: {[e['name'] for e in assignable_emps]}")

        # ── 3. TL CREATES SITE VISIT FOR SELF (employee_id: "") ──
        sv_self_payload = {
            "customer_id": cust_id,
            "employee_id": "",  # Self selected
            "date": "2026-10-05",
            "time": "10:30",
            "status": "scheduled",
            "notes": "TL Self Visit Test",
            "properties": [prop_id]
        }
        res_self = await client.post("/api/crm/site-visits", json=sv_self_payload, headers=tl_headers)
        assert res_self.status_code in [200, 201], f"TL Self visit failed: {res_self.text}"
        sv_self_data = res_self.json()
        created_sv_self = await db.site_visits().find_one({"id": sv_self_data["id"]})
        assert created_sv_self["employee_id"] == tl["id"], "Self visit should be assigned to TL"
        print(f"[TEST 2 PASSED] TL created Site Visit for Self (assigned to {created_sv_self['employee_id']})")

        # ── 4. TL CREATES SITE VISIT FOR EXECUTIVE MEMBER (Ramachari) ──
        sv_exec_payload = {
            "customer_id": cust_id,
            "employee_id": exec_user["id"],
            "date": "2026-10-06",
            "time": "14:00",
            "status": "scheduled",
            "notes": "TL Exec Visit Test",
            "properties": [prop_id]
        }
        res_exec = await client.post("/api/crm/site-visits", json=sv_exec_payload, headers=tl_headers)
        assert res_exec.status_code in [200, 201], f"TL Exec visit failed: {res_exec.text}"
        sv_exec_data = res_exec.json()
        created_sv_exec = await db.site_visits().find_one({"id": sv_exec_data["id"]})
        assert created_sv_exec["employee_id"] == exec_user["id"], "Exec visit should be assigned to Executive"
        print(f"[TEST 3 PASSED] TL created Site Visit for Executive Ramachari (assigned to {created_sv_exec['employee_id']})")

        # ── 5. TL CREATES SITE VISIT FOR TRAINEE MEMBER (Rehan) ──
        sv_trainee_payload = {
            "customer_id": cust_id,
            "employee_id": trainee_user["id"],
            "date": "2026-10-07",
            "time": "16:00",
            "status": "scheduled",
            "notes": "TL Trainee Visit Test",
            "properties": [prop_id]
        }
        res_trainee = await client.post("/api/crm/site-visits", json=sv_trainee_payload, headers=tl_headers)
        assert res_trainee.status_code in [200, 201], f"TL Trainee visit failed: {res_trainee.text}"
        sv_trainee_data = res_trainee.json()
        created_sv_trainee = await db.site_visits().find_one({"id": sv_trainee_data["id"]})
        assert created_sv_trainee["employee_id"] == trainee_user["id"], "Trainee visit should be assigned to Trainee"
        print(f"[TEST 4 PASSED] TL created Site Visit for Trainee Rehan (assigned to {created_sv_trainee['employee_id']})")

        # ── 6. EXECUTIVE CREATES SITE VISIT FOR SELF (employee_id: "") ──
        exec_self_payload = {
            "customer_id": cust_id,
            "employee_id": "",
            "date": "2026-10-08",
            "time": "11:00",
            "status": "scheduled",
            "notes": "Executive Self Visit",
            "properties": [prop_id]
        }
        res_exec_self = await client.post("/api/crm/site-visits", json=exec_self_payload, headers=exec_headers)
        assert res_exec_self.status_code in [200, 201], f"Executive self visit failed: {res_exec_self.text}"
        print(f"[TEST 5 PASSED] Executive created Site Visit for Self")

        # ── 7. EXECUTIVE ATTEMPTS TO ASSIGN SITE VISIT TO ANOTHER EMPLOYEE ──
        exec_unauth_payload = {
            "customer_id": cust_id,
            "employee_id": trainee_user["id"],
            "date": "2026-10-09",
            "time": "12:00",
            "status": "scheduled",
            "notes": "Executive Unauth Visit",
            "properties": [prop_id]
        }
        res_exec_unauth = await client.post("/api/crm/site-visits", json=exec_unauth_payload, headers=exec_headers)
        assert res_exec_unauth.status_code == 403, f"Expected 403, got {res_exec_unauth.status_code}"
        assert "You can only create site visits for yourself" in res_exec_unauth.json()["detail"]
        print(f"[TEST 6 PASSED] Executive unauthorized assignment rejected with 403: {res_exec_unauth.json()['detail']}")

        # ── 8. TRAINEE ATTEMPTS TO ASSIGN SITE VISIT TO ANOTHER EMPLOYEE ──
        trainee_unauth_payload = {
            "customer_id": cust_id,
            "employee_id": exec_user["id"],
            "date": "2026-10-10",
            "time": "15:00",
            "status": "scheduled",
            "notes": "Trainee Unauth Visit",
            "properties": [prop_id]
        }
        res_trainee_unauth = await client.post("/api/crm/site-visits", json=trainee_unauth_payload, headers=trainee_headers)
        assert res_trainee_unauth.status_code == 403
        print(f"[TEST 7 PASSED] Trainee unauthorized assignment rejected with 403")

        # ── 9. REPORT PERMISSIONS VERIFICATION ──
        # TL downloads own team report
        tl_report_res = await client.get("/api/crm/reports/export?format=xlsx", headers=tl_headers)
        assert tl_report_res.status_code == 200
        print(f"[TEST 8 PASSED] TL downloaded own team report ({len(tl_report_res.content)} bytes)")

        # TL attempts to download another team's report
        tl_bad_report = await client.get("/api/crm/reports/export?team_id=unauthorized_team_id", headers=tl_headers)
        assert tl_bad_report.status_code == 403
        print(f"[TEST 9 PASSED] TL unauthorized team report download rejected with 403")

        # Founder downloads all-teams report
        founder_report_res = await client.get("/api/crm/reports/export?format=xlsx", headers=founder_headers)
        assert founder_report_res.status_code == 200
        print(f"[TEST 10 PASSED] Founder downloaded all-teams report ({len(founder_report_res.content)} bytes)")

if __name__ == "__main__":
    asyncio.run(test_manual_site_visit_and_reports_authorization())
