"""
One-time patch script to ensure organizational hierarchy is correctly set in MongoDB.

Run: python -m scripts.patch_org_hierarchy
or:  python scripts/patch_org_hierarchy.py
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

import db
from crm_models import now_iso


async def patch():
    print("=" * 60)
    print("VisitSarva CRM — Organizational Hierarchy Patch")
    print("=" * 60)

    # Fetch all required employee records
    founder = await db.employees().find_one({"email": "sanjayj@visitsarva.com"})
    bdo = await db.employees().find_one({"email": "lakshmi@visitsarva.com"})
    team_lead = await db.employees().find_one({"email": "varun@visitsarva.com"})
    executive = await db.employees().find_one({"email": "ramachari@visitsarva.com"})
    trainee = await db.employees().find_one({"email": "rehan@visitsarva.com"})

    # Report what we found
    print("\n--- Existing Employees ---")
    for label, emp in [("Founder", founder), ("BDO", bdo), ("Team Lead", team_lead),
                       ("Executive", executive), ("Trainee", trainee)]:
        if emp:
            print(f"  {label}: {emp['name']} ({emp['email']}) — id={emp['id']}")
        else:
            print(f"  {label}: NOT FOUND")

    if not founder:
        print("\nERROR: Founder account not found. Run crm_seed.py first.")
        return

    # Fix roles in case they're wrong
    if bdo:
        await db.employees().update_one(
            {"id": bdo["id"]},
            {"$set": {"role": "bdo", "updated_at": now_iso()}}
        )
    if team_lead:
        await db.employees().update_one(
            {"id": team_lead["id"]},
            {"$set": {"role": "team_lead", "updated_at": now_iso()}}
        )
    if executive:
        await db.employees().update_one(
            {"id": executive["id"]},
            {"$set": {"role": "executive", "updated_at": now_iso()}}
        )
    if trainee:
        await db.employees().update_one(
            {"id": trainee["id"]},
            {"$set": {"role": "trainee", "updated_at": now_iso()}}
        )

    # Step 1: BDO reports to Founder
    if bdo and founder:
        await db.employees().update_one(
            {"id": bdo["id"]},
            {"$set": {
                "reporting_manager": founder["id"],
                "created_by": founder["id"],
                "updated_at": now_iso()
            }}
        )
        print(f"\n[OK] BDO ({bdo['name']}) -> reports_to -> Founder ({founder['name']})")

    # Step 2: Find or create TEAM ACHIEVERS
    team_achievers = await db.teams().find_one({"name": {"$regex": "TEAM ACHIEVERS", "$options": "i"}})
    if team_achievers:
        print(f"\n[OK] Found team: {team_achievers['name']} (id={team_achievers['id']})")
        team_achievers_id = team_achievers["id"]
        # Ensure team_leader_id is correct
        if team_lead:
            await db.teams().update_one(
                {"id": team_achievers_id},
                {"$set": {
                    "name": "TEAM ACHIEVERS",
                    "team_leader_id": team_lead["id"],
                    "status": "active",
                    "updated_at": now_iso()
                }}
            )
            print(f"  -> Updated team_leader_id to {team_lead['name']}")
    elif team_lead:
        from crm_models import Team
        count = await db.teams().count_documents({})
        team_obj = Team(
            team_id=f"VS-TEAM-{(count + 1):06d}",
            name="TEAM ACHIEVERS",
            team_leader_id=team_lead["id"],
            created_by=bdo["id"] if bdo else founder["id"],
            status="active"
        )
        await db.teams().insert_one(team_obj.model_dump())
        team_achievers_id = team_obj.id
        print(f"\n[OK] Created team: TEAM ACHIEVERS (id={team_achievers_id})")
    else:
        print("\nWARNING: No team lead found, cannot create TEAM ACHIEVERS")
        team_achievers_id = None

    # Step 3: Team Leader -> reports to BDO, belongs to TEAM ACHIEVERS
    if team_lead:
        update_fields = {
            "reporting_manager": bdo["id"] if bdo else founder["id"],
            "created_by": bdo["id"] if bdo else founder["id"],
            "updated_at": now_iso()
        }
        if team_achievers_id:
            update_fields["team_id"] = team_achievers_id
        await db.employees().update_one(
            {"id": team_lead["id"]},
            {"$set": update_fields}
        )
        print(f"[OK] Team Lead ({team_lead['name']}) -> reports_to -> BDO ({bdo['name'] if bdo else 'Founder'})")
        print(f"  -> team_id = {team_achievers_id}")

    # Step 4: Executive -> reports to Team Leader, belongs to TEAM ACHIEVERS
    if executive and team_lead:
        update_fields = {
            "reporting_manager": team_lead["id"],
            "created_by": team_lead["id"],
            "updated_at": now_iso()
        }
        if team_achievers_id:
            update_fields["team_id"] = team_achievers_id
        await db.employees().update_one(
            {"id": executive["id"]},
            {"$set": update_fields}
        )
        print(f"[OK] Executive ({executive['name']}) -> reports_to -> Team Lead ({team_lead['name']})")

    # Step 5: Trainee -> reports to Team Leader, belongs to TEAM ACHIEVERS
    if trainee and team_lead:
        update_fields = {
            "reporting_manager": team_lead["id"],
            "created_by": team_lead["id"],
            "updated_at": now_iso()
        }
        if team_achievers_id:
            update_fields["team_id"] = team_achievers_id
        await db.employees().update_one(
            {"id": trainee["id"]},
            {"$set": update_fields}
        )
        print(f"[OK] Trainee ({trainee['name']}) -> reports_to -> Team Lead ({team_lead['name']})")

    # Verification
    print("\n--- Final Hierarchy Verification ---")
    all_emps = await db.employees().find({}, {"_id": 0, "password_hash": 0}).to_list(length=100)
    id_to_name = {e["id"]: e["name"] for e in all_emps}
    for emp in all_emps:
        mgr_name = id_to_name.get(emp.get("reporting_manager"), "—")
        print(f"  {emp['role']:12s} | {emp['name']:20s} | reports_to: {mgr_name} | team_id: {str(emp.get('team_id', '—'))[:12]}")

    print("\n[OK] Organizational hierarchy patch complete!")


if __name__ == "__main__":
    asyncio.run(patch())
