from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import requests
import json
import os
import hashlib
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "data/reports.json"
BRIEF_FILE = "data/briefs.json"

def load_json(path, default):
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return default

def write_json(path, data):
    os.makedirs("data", exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

FORBIDDEN_FIELDS = {"raw_log", "ai_narrative", "request_payload", "response_code", "evidence"}
REQUIRED_FIELDS = {"source_org", "attack_type", "mitre_technique", "timestamp", "attacker_infrastructure"}

def fingerprint_of(report):
    return report.get("attacker_infrastructure", {}).get("source_ip", "unknown")

def dedup_key(r):
    return f'{r.get("source_org")}|{r.get("timestamp")}|{fingerprint_of(r)}|{r.get("attack_type")}'

@app.get("/health")
def health():
    return {"status": "master-ai is running"}

@app.post("/reports")
def receive_report(report: dict = Body(...)):
    # PRIVACY GATE: refuse anything that isn't sanitized
    leaked = FORBIDDEN_FIELDS & set(report.keys())
    if leaked:
        raise HTTPException(status_code=400, detail=f"PRIVACY GATE: rejected non-sanitized fields {sorted(leaked)}")
    missing = REQUIRED_FIELDS - set(report.keys())
    if missing:
        raise HTTPException(status_code=422, detail=f"missing required fields {sorted(missing)}")

    reports = load_json(DATA_FILE, [])
    if any(dedup_key(r) == dedup_key(report) for r in reports):
        return {"stored": False, "reason": "duplicate report"}
    reports.append(report)
    write_json(DATA_FILE, reports)
    return {"stored": True, "total_reports": len(reports)}

def compute_campaigns():
    """Correlation by attacker infrastructure fingerprint. Recomputed from the full
    report set on every call — order-independent by construction."""
    reports = load_json(DATA_FILE, [])
    groups = {}
    for r in reports:
        groups.setdefault(fingerprint_of(r), []).append(r)

    ordered = sorted(groups.items(), key=lambda kv: min(x["timestamp"] for x in kv[1]))
    briefs = load_json(BRIEF_FILE, {})
    campaigns = []
    for n, (fp, rs) in enumerate(ordered, start=1):
        rs = sorted(rs, key=lambda x: x["timestamp"])
        cached = briefs.get(fp)
        campaigns.append({
            "campaign_id": f"camp_{rs[0]['timestamp'][:10].replace('-', '_')}_{n:03d}",
            "threat_actor": f"TC-{n:02d}",
            "fingerprint": {"source_ip": fp},
            "orgs_affected": sorted({x["source_org"] for x in rs}),
            "attack_types": sorted({x["attack_type"] for x in rs}),
            "techniques": sorted({x["mitre_technique"] for x in rs}),
            "report_count": len(rs),
            "first_seen": rs[0]["timestamp"],
            "last_seen": rs[-1]["timestamp"],
            "intel_brief": cached["text"] if cached and cached.get("report_count") == len(rs) else None,
            "reports": rs,
        })
    return campaigns

@app.get("/campaigns")
def get_campaigns():
    return compute_campaigns()

@app.post("/campaigns/{campaign_id}/brief")
def generate_brief(campaign_id: str):
    camp = next((c for c in compute_campaigns() if c["campaign_id"] == campaign_id), None)
    if camp is None:
        raise HTTPException(status_code=404, detail="campaign not found")

    lines = "\n".join(
        f'- {r["timestamp"]} | {r["source_org"]} | {r["attack_type"]} ({r["mitre_technique"]}) | {r["observed_behaviour"]}'
        for r in camp["reports"]
    )
    prompt = f"""You are a threat intelligence analyst writing a short global intelligence brief.

Campaign: {camp["campaign_id"]}
Threat actor label: {camp["threat_actor"]} (a self-assigned cluster label — do NOT reference any real-world threat group names)
Attacker infrastructure fingerprint: {camp["fingerprint"]["source_ip"]}
Organizations affected: {", ".join(camp["orgs_affected"])}

Sanitized reports:
{lines}

Write a 3-4 sentence brief: what this actor cluster is doing across the affected organizations, why the events are correlated (shared infrastructure fingerprint), and one recommended defensive action. Be factual, no speculation, no real-world attribution. Write only the brief."""

    response = requests.post(
        "http://host.docker.internal:11434/api/generate",
        json={"model": "qwen2.5-coder:7b", "prompt": prompt, "stream": False}
    )
    text = response.json().get("response", "Error generating brief")

    briefs = load_json(BRIEF_FILE, {})
    briefs[camp["fingerprint"]["source_ip"]] = {"text": text, "report_count": camp["report_count"]}
    write_json(BRIEF_FILE, briefs)
    return {"campaign_id": campaign_id, "intel_brief": text}

# ---- FEATURE 3: Zero-Knowledge Chain-of-Custody (submission -> verdict) ----

CUSTODY_FILE = "data/custody.json"
CUSTODY_GENESIS = "0" * 64

def custody_canonical(block):
    core = {k: v for k, v in block.items() if k != "block_hash"}
    return json.dumps(core, sort_keys=True, separators=(",", ":"))

def custody_hash(prev_hash, index, core_json):
    return hashlib.sha256(f"{prev_hash}|{index}|{core_json}".encode()).hexdigest()

def load_custody():
    return load_json(CUSTODY_FILE, [])

def write_custody(items):
    write_json(CUSTODY_FILE, items)

@app.post("/custody/submit")
def submit_custody(payload: dict = Body(...)):
    org_id = payload.get("org_id")
    blocks = payload.get("blocks", [])
    if not org_id or not blocks:
        raise HTTPException(status_code=422, detail="org_id and blocks are required")

    submissions = load_custody()
    submission_id = f"sub_{org_id}_{int(time.time())}"
    submissions.append({
        "submission_id": submission_id,
        "org_id": org_id,
        "submitted_at": payload.get("submitted_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "blocks": blocks,
        "status": "pending",
        "verdict": None,
        "analyzed_at": None,
    })
    write_custody(submissions)
    return {"submission_id": submission_id, "status": "pending"}

@app.get("/custody/submissions")
def get_custody_submissions():
    """Full detail including raw blocks — Authority-only in the UI, never exposed via /custody/verdicts."""
    return load_custody()

@app.post("/custody/submissions/{submission_id}/analyze")
def analyze_custody_submission(submission_id: str):
    submissions = load_custody()
    sub = next((s for s in submissions if s["submission_id"] == submission_id), None)
    if sub is None:
        raise HTTPException(status_code=404, detail="submission not found")

    blocks = sub["blocks"]
    prev = CUSTODY_GENESIS
    chain_valid = True
    for idx, b in enumerate(blocks):
        recomputed = custody_hash(prev, idx, custody_canonical(b))
        content_intact = recomputed == b.get("block_hash")
        link_intact = b.get("prev_hash") == prev
        if not (content_intact and link_intact):
            chain_valid = False
            break
        prev = b.get("block_hash", recomputed)

    sub["status"] = "analyzed"
    sub["verdict"] = "VERIFIED" if chain_valid else "TAMPERED"
    sub["analyzed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    write_custody(submissions)
    return {"submission_id": submission_id, "verdict": sub["verdict"]}

@app.get("/custody/verdicts")
def get_custody_verdicts():
    """Public, network-wide view — verdict only, never the underlying evidence blocks."""
    submissions = load_custody()
    return [
        {
            "submission_id": s["submission_id"],
            "org_id": s["org_id"],
            "submitted_at": s["submitted_at"],
            "status": s["status"],
            "verdict": s["verdict"],
            "analyzed_at": s["analyzed_at"],
        }
        for s in submissions
    ]

@app.get("/reports/all")
def get_all_reports():
    """Flat list of every sanitized report shared across the network — visible to
    every org and Authority. Already privacy-filtered at ingest; never contains
    raw logs, payloads, or narratives."""
    return load_json(DATA_FILE, [])