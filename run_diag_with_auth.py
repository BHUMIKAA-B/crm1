import json, asyncio, httpx, os

BASE = "http://127.0.0.1:8000"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@visitsarva.in")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "your_admin_password")  # replace if needed

async def fetch_token():
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{BASE}/api/auth/login",
                                 json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        resp.raise_for_status()
        return resp.json()["access_token"]

async def main():
    token = await fetch_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(headers=headers, timeout=20) as client:
        cfg = await client.get(f"{BASE}/api/admin/calling-config")
        print("\n--- CALLING CONFIG ---")
        print(json.dumps(cfg.json(), indent=2))

        payload = {"phone": "+917624833083", "name": "Test User", "note": "Automated test"}
        test = await client.post(f"{BASE}/api/admin/test-call", json=payload)
        print("\n--- TEST CALL RESULT ---")
        print(json.dumps(test.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(main())
