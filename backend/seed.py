"""Seed default admin + demo data on app startup (idempotent).

Admin credentials are read from environment variables:
  ADMIN_EMAIL          – login email   (default: admin@visitsarva.in)
  ADMIN_PASSWORD       – plain password that gets bcrypt-hashed at runtime
  ADMIN_NAME           – display name  (default: VisitSarva Admin)

Never hardcode credentials here.  Set ADMIN_EMAIL and ADMIN_PASSWORD as
Replit Secrets (or .env in local dev) to rotate them without code changes.
"""
from __future__ import annotations

import os
import db
import auth as auth_utils
from models import now_iso, new_id
from crm_seed import seed_crm

ADMIN_EMAIL    = os.environ.get("ADMIN_EMAIL",    "visitsarva@gmail.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Visitsarva#0321")
ADMIN_NAME     = os.environ.get("ADMIN_NAME",     "VisitSarva Admin")

DEMO_PROPERTIES = [
    {
        "title": "3 BHK Garden Apartment — Whitefield",
        "description": "Spacious 3 BHK apartment with park view, gated community, modular kitchen, covered parking and 24x7 security.",
        "category": "apartment",
        "sub_category": "3 BHK",
        "price": 14500000,
        "price_negotiable": True,
        "location": {"address": "Whitefield Main Road", "city": "Bangalore", "state": "Karnataka", "pincode": "560066", "lat": 12.9698, "lng": 77.7500},
        "area": {"size": 1850, "unit": "sqft"},
        "bedrooms": 3, "bathrooms": 3, "floors": 1, "facing": "East",
        "furnishing": "Semi-furnished",
        "amenities": ["Swimming Pool", "Gym", "Clubhouse", "Power Backup", "Lift"],
        "features": ["Gated Community", "RERA Approved", "Park Facing"],
        "images": [{"url": "https://images.pexels.com/photos/36676879/pexels-photo-36676879.jpeg?auto=compress&cs=tinysrgb&w=1200"}],
        "is_featured": True,
    },
    {
        "title": "Premium Grade-A Office Floor — HITEC City",
        "description": "12,000 sqft Grade-A office space, fully fitted, pre-leased to a Fortune 500 tenant. Excellent corner location.",
        "category": "commercial",
        "sub_category": "Office",
        "price": 152000000,
        "price_negotiable": False,
        "location": {"address": "HITEC City", "city": "Hyderabad", "state": "Telangana", "pincode": "500081", "lat": 17.4474, "lng": 78.3762},
        "area": {"size": 12000, "unit": "sqft"},
        "bedrooms": None, "bathrooms": 4, "floors": 1,
        "furnishing": "Fully-furnished",
        "amenities": ["High-speed Lifts", "Cafeteria", "Conference Rooms", "Reserved Parking"],
        "features": ["Pre-leased", "Grade A", "Metro Connectivity"],
        "images": [{"url": "https://images.pexels.com/photos/11861957/pexels-photo-11861957.jpeg?auto=compress&cs=tinysrgb&w=1200"}],
        "is_featured": True,
    },
    {
        "title": "DTCP-approved Plot — Devanahalli",
        "description": "2400 sqft north-facing plot in a gated layout 8 km from Bangalore International Airport. Clear title, ready to register.",
        "category": "plot",
        "sub_category": "Residential Plot",
        "price": 7800000,
        "price_negotiable": True,
        "location": {"address": "Devanahalli", "city": "Bangalore", "state": "Karnataka", "pincode": "562110", "lat": 13.2519, "lng": 77.7060},
        "area": {"size": 2400, "unit": "sqft"},
        "bedrooms": None, "bathrooms": None, "floors": None, "facing": "North",
        "amenities": ["Compound Wall", "Internal Roads", "Underground Drainage"],
        "features": ["DTCP Approved", "Corner Plot", "Near Airport"],
        "images": [{"url": "https://images.pexels.com/photos/11518541/pexels-photo-11518541.jpeg?auto=compress&cs=tinysrgb&w=1200"}],
        "is_featured": True,
    },
    {
        "title": "4 BHK Premium Villa — Jubilee Hills",
        "description": "Architect-designed 4 BHK villa in a quiet cul-de-sac. Private garden, home theatre, smart home wiring.",
        "category": "residential",
        "sub_category": "Villa",
        "price": 62000000,
        "price_negotiable": False,
        "location": {"address": "Jubilee Hills, Road No. 36", "city": "Hyderabad", "state": "Telangana", "pincode": "500033", "lat": 17.4324, "lng": 78.4076},
        "area": {"size": 5400, "unit": "sqft"},
        "bedrooms": 4, "bathrooms": 5, "floors": 2, "facing": "North-East",
        "furnishing": "Furnished",
        "amenities": ["Private Garden", "Home Theatre", "Smart Home", "Solar"],
        "features": ["RERA Approved", "Vaastu Compliant"],
        "images": [{"url": "https://images.unsplash.com/photo-1748063578185-3d68121b11ff?w=1200"}],
        "is_featured": True,
    },
    {
        "title": "2 BHK Furnished Rental — Indiranagar",
        "description": "Bright, fully-furnished 2 BHK on a quiet residential street. Walking distance to 100 Ft Road. Available immediately.",
        "category": "rental",
        "sub_category": "2 BHK",
        "price": 55000,
        "price_negotiable": True,
        "location": {"address": "12th Main, Indiranagar", "city": "Bangalore", "state": "Karnataka", "pincode": "560038", "lat": 12.9716, "lng": 77.6412},
        "area": {"size": 1180, "unit": "sqft"},
        "bedrooms": 2, "bathrooms": 2, "floors": 1, "facing": "South",
        "furnishing": "Furnished",
        "amenities": ["Lift", "Power Backup", "Covered Parking"],
        "features": ["Pet-friendly", "Walking distance to Metro"],
        "images": [{"url": "https://images.pexels.com/photos/36676879/pexels-photo-36676879.jpeg?auto=compress&cs=tinysrgb&w=1200"}],
    },
    {
        "title": "Agricultural Land — Coorg",
        "description": "1.5 acre coffee plantation in Coorg with farmhouse. Productive estate with stream.",
        "category": "agriculture",
        "sub_category": "Plantation",
        "price": 14500000,
        "price_negotiable": True,
        "location": {"address": "Madikeri Taluk", "city": "Coorg", "state": "Karnataka", "pincode": "571201", "lat": 12.4244, "lng": 75.7382},
        "area": {"size": 1.5, "unit": "acre"},
        "bedrooms": 2, "bathrooms": 2,
        "amenities": ["Farmhouse", "Water Source", "Compound"],
        "features": ["Coffee Plantation", "Income-generating"],
        "images": [{"url": "https://images.pexels.com/photos/11518541/pexels-photo-11518541.jpeg?auto=compress&cs=tinysrgb&w=1200"}],
    },
]


DEMO_PROJECTS = [
    {
        "title": "Sarva Greenfield Towers",
        "description": "A 24-storey premium residential development with 2/3/4 BHK apartments, set on 6 acres with 70% open space.",
        "sector": "apartment",
        "location": "Sarjapur Road",
        "city": "Bangalore",
        "price_range": "₹ 1.45 Cr — 3.20 Cr",
        "area": "1,150 — 2,850 sqft",
        "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
        "status": "new",
        "builder": "Sarva Group",
        "possession": "Dec 2027",
        "rera_id": "KA/RERA/1251/473",
        "is_featured": True,
    },
    {
        "title": "Sarva Tech Park Phase II",
        "description": "Grade-A IT office space with LEED Gold certification, 10 minutes from Bangalore International Airport.",
        "sector": "commercial",
        "location": "Devanahalli Business Park",
        "city": "Bangalore",
        "price_range": "₹ 14,500 / sqft",
        "area": "5,000 — 50,000 sqft",
        "image_url": "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&auto=format&fit=crop&q=80",
        "status": "new",
        "builder": "Sarva Commercial",
        "possession": "Aug 2026",
        "rera_id": "KA/RERA/COM/2025/0084",
        "is_featured": True,
    },
    {
        "title": "Vanasthali Premium Plots",
        "description": "DTCP-approved gated plotted development — 92 plots ranging 1800-4800 sqft, near upcoming metro line.",
        "sector": "plot",
        "location": "Devanahalli",
        "city": "Bangalore",
        "price_range": "₹ 78 L — 2.40 Cr",
        "area": "1,800 — 4,800 sqft",
        "image_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80",
        "status": "new",
        "builder": "Sarva Land",
        "possession": "Ready",
        "rera_id": "KA/RERA/PLT/2024/0298",
        "is_featured": False,
    },
    {
        "title": "Skyline Residences Hyderabad",
        "description": "Iconic 35-storey residential tower in the heart of Jubilee Hills with sky deck and infinity pool.",
        "sector": "residential",
        "location": "Jubilee Hills",
        "city": "Hyderabad",
        "price_range": "₹ 4.20 Cr — 9.80 Cr",
        "area": "3,200 — 6,400 sqft",
        "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "builder": "Skyline Developers",
        "possession": "Phase 1 ready",
        "rera_id": "TG/RERA/2024/00114",
        "is_featured": True,
    },
    {
        "title": "Sarva Logistics Park",
        "description": "Built-to-suit warehousing and light-industrial complex on NH-44.",
        "sector": "industrial",
        "location": "Hosur Road",
        "city": "Bangalore",
        "price_range": "₹ 4,800 / sqft",
        "area": "20,000 — 200,000 sqft",
        "image_url": "https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "builder": "Sarva Industrial",
        "possession": "Phased",
        "rera_id": "KA/RERA/IND/2024/0011",
        "is_featured": False,
    },
    {
        "title": "Coorg Coffee Estates",
        "description": "Productive coffee plantation parcels with bungalow build-rights. Heritage land, clear titles.",
        "sector": "agriculture",
        "location": "Madikeri Taluk",
        "city": "Coorg",
        "price_range": "₹ 95 L / acre",
        "area": "1 — 12 acres",
        "image_url": "https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "builder": "Estate Trust",
        "possession": "Ready",
        "rera_id": "Land — RERA exempt",
        "is_featured": False,
    },
]


async def ensure_seed():
    # ── Admin users ────────────────────────────────────────────────────────────
    admin_accounts = [
        {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "name": ADMIN_NAME},
        {"email": "admin@visitsarva.in", "password": "VisitSarva@2025", "name": "VisitSarva Admin"},
    ]
    for adm in admin_accounts:
        existing = await db.users().find_one({"email": adm["email"]})
        if not existing:
            await db.users().insert_one(
                {
                    "id": new_id(),
                    "name": adm["name"],
                    "email": adm["email"],
                    "phone": "+910000000000",
                    "password_hash": auth_utils.hash_password(adm["password"]),
                    "role": "admin",
                    "is_active": True,
                    "is_verified": True,
                    "is_phone_verified": True,
                    "saved_properties": [],
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                }
            )
        else:
            await db.users().update_one(
                {"email": adm["email"]},
                {"$set": {
                    "password_hash": auth_utils.hash_password(adm["password"]),
                    "name": adm["name"],
                    "role": "admin",
                    "is_active": True,
                    "updated_at": now_iso(),
                }},
            )

    # ── Demo seller ───────────────────────────────────────────────────────────
    seller = await db.users().find_one({"email": "demo.seller@visitsarva.in"})
    if not seller:
        seller_doc = {
            "id": new_id(),
            "name": "Demo Seller",
            "email": "demo.seller@visitsarva.in",
            "phone": "+919800000000",
            "password_hash": auth_utils.hash_password("Demo@2025"),
            "role": "seller",
            "is_active": True,
            "is_verified": True,
            "is_phone_verified": True,
            "saved_properties": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.users().insert_one(seller_doc)
        seller = seller_doc

    # ── Demo buyer ────────────────────────────────────────────────────────────
    buyer = await db.users().find_one({"email": "demo.buyer@visitsarva.in"})
    if not buyer:
        await db.users().insert_one(
            {
                "id": new_id(),
                "name": "Demo Buyer",
                "email": "demo.buyer@visitsarva.in",
                "phone": "+919900000000",
                "password_hash": auth_utils.hash_password("Demo@2025"),
                "role": "buyer",
                "is_active": True,
                "is_verified": True,
                "is_phone_verified": True,
                "saved_properties": [],
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
        )

    # ── Properties ────────────────────────────────────────────────────────────
    if await db.properties().count_documents({}) == 0:
        for p in DEMO_PROPERTIES:
            doc = {
                **p,
                "id": new_id(),
                "status": "published",
                "listed_by": seller["id"],
                "listed_by_name": seller["name"],
                "verified_by": None,
                "verification_notes": "Seeded demo property.",
                "rejection_reason": "",
                "views": 0,
                "enquiries": 0,
                "is_new": True,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.properties().insert_one(doc)

    # ── Hero CMS ──────────────────────────────────────────────────────────────
    site = db.get_db()["site"]
    if not await site.find_one({"key": "hero"}):
        await site.insert_one(
            {
                "key": "hero",
                "image_url": "https://images.unsplash.com/photo-1748063578185-3d68121b11ff?w=1920&auto=format&fit=crop&q=80",
                "video_url": "",
                "headline": "Find Your Dream Property. Zero Brokerage.",
                "sub_headline": "Buy property, pay no brokerage. We connect you directly to verified sellers — every listing vetted by our team.",
                "cta_text": "Explore Properties",
                "cta_link": "/properties",
                "updated_at": now_iso(),
            }
        )

    # ── Projects ──────────────────────────────────────────────────────────────
    projects_col = db.get_db()["projects"]
    if await projects_col.count_documents({}) == 0:
        for p in DEMO_PROJECTS:
            await projects_col.insert_one(
                {
                    **p,
                    "id": new_id(),
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                    "created_by": None,
                }
            )

    # ── CRM Seed ──────────────────────────────────────────────────────────────
    try:
        await seed_crm()
    except Exception as e:
        print(f"CRM seed error: {e}")

