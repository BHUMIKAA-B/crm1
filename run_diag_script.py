import json, asyncio, httpx
BASE='http://127.0.0.1:8000'

async def main():
    async with httpx.AsyncClient(timeout=20) as client:
        cfg = await client.get(f"{BASE}/api/admin/calling-config")
        print('\n--- CALLING CONFIG ---')
        print(json.dumps(cfg.json(), indent=2))
        payload={"phone":"+917624833083","name":"Test User","note":"Automated test"}
        resp = await client.post(f"{BASE}/api/admin/test-call", json=payload)
        print('\n--- TEST CALL RESULT ---')
        print(json.dumps(resp.json(), indent=2))

if __name__ == '__main__':
    asyncio.run(main())
