"""
Generates realistic synthetic attack logs and posts them through each org's
REAL /ingest endpoint -- so they go through actual AI narrative generation,
hash-chaining, and sanitized-report submission exactly like real data would.

Run this locally (NOT in a sandbox) with your docker-compose stack running:
    pip install requests
    python generate_synthetic_incidents.py

Takes a minute or two since each /ingest call triggers a real Ollama LLM call.
"""
import random
import time
from datetime import datetime, timedelta
import requests

random.seed(7)

ORGS = {
    "org_a": "http://localhost:8001",
    "org_b": "http://localhost:8002",
    "org_c": "http://localhost:8004",
}

ATTACK_TYPES = ["Credential Stuffing", "SQL Injection"]
ENDPOINTS = ["/api/v1/login", "/api/v1/checkout", "/api/v1/search", "/api/v1/profile", "/api/v1/admin"]

INCIDENTS_PER_ORG = 15


def rand_ip():
    return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"


def gen_log(base_time, idx):
    atype = random.choice(ATTACK_TYPES)
    endpoint = random.choice(ENDPOINTS)
    ts = (base_time + timedelta(minutes=idx * 7)).strftime("%Y-%m-%dT%H:%M:%SZ")

    if atype == "Credential Stuffing":
        payload = f"username=user{random.randint(1, 999)}&password=****"
        code = random.choice([401, 401, 403])
    else:
        payload = random.choice([
            "' OR '1'='1",
            "1; DROP TABLE users;--",
            "' UNION SELECT * FROM accounts--",
        ])
        code = random.choice([500, 400, 403])

    return {
        "timestamp": ts,
        "source_ip": rand_ip(),
        "endpoint": endpoint,
        "attack_type": atype,
        "request_payload": payload,
        "response_code": code,
    }


def main():
    base_time = datetime.utcnow()

    for org_id, base_url in ORGS.items():
        print(f"\n--- Seeding {org_id} at {base_url} ---")
        success = 0
        for i in range(INCIDENTS_PER_ORG):
            log = gen_log(base_time, i)
            try:
                r = requests.post(f"{base_url}/ingest", json=log, timeout=30)
                if r.status_code == 200:
                    success += 1
                    print(f"  [{i+1}/{INCIDENTS_PER_ORG}] OK -- {log['attack_type']} from {log['source_ip']}")
                else:
                    print(f"  [{i+1}/{INCIDENTS_PER_ORG}] FAILED -- HTTP {r.status_code}: {r.text[:200]}")
            except requests.RequestException as e:
                print(f"  [{i+1}/{INCIDENTS_PER_ORG}] ERROR -- {e}")
            time.sleep(0.3)  # be gentle on the local Ollama call
        print(f"--- {org_id}: {success}/{INCIDENTS_PER_ORG} incidents ingested ---")

    print("\nDone. Verify with:")
    for org_id, base_url in ORGS.items():
        print(f"  curl {base_url}/commit")


if __name__ == "__main__":
    main()
