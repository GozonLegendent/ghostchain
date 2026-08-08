from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import os
import re
import hashlib

ORG_ID = "org_c"
GENESIS = "0" * 64
MASTER_URL = "http://master-ai:8000"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "data/incidents.json"

def load_incidents():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return []

def write_incidents(incidents):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(incidents, f, indent=2)

# ---- evidence hash-chain ----

def canonical_content(incident):
    core = {k: v for k, v in incident.items() if k != "evidence"}
    return json.dumps(core, sort_keys=True, separators=(",", ":"))

def compute_block_hash(prev_hash, index, core_json):
    return hashlib.sha256(f"{prev_hash}|{index}|{core_json}".encode()).hexdigest()

def ensure_chain():
    incidents = load_incidents()
    changed = False
    prev = GENESIS
    for idx, inc in enumerate(incidents):
        if "evidence" not in inc:
            inc["evidence"] = {
                "block_index": idx,
                "prev_hash": prev,
                "block_hash": compute_block_hash(prev, idx, canonical_content(inc)),
            }
            changed = True
        prev = inc["evidence"]["block_hash"]
    if changed:
        write_incidents(incidents)

ensure_chain()

def save_incident(incident):
    incidents = load_incidents()
    idx = len(incidents)
    prev = incidents[-1]["evidence"]["block_hash"] if incidents else GENESIS
    incident["evidence"] = {
        "block_index": idx,
        "prev_hash": prev,
        "block_hash": compute_block_hash(prev, idx, canonical_content(incident)),
    }
    incidents.append(incident)
    write_incidents(incidents)

# ---- PHASE 3: privacy filter + sanitized report exchange ----

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
ACCOUNT_RE = re.compile(r"(user(name)?|acct|account|password|token)[=:]\S+", re.IGNORECASE)

def scrub(text):
    """Regex PII scrubber: removes emails and account-style tokens from free text."""
    text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    text = ACCOUNT_RE.sub("[REDACTED_CREDENTIAL]", text)
    return text

ATTACK_KNOWLEDGE = {
    "Credential Stuffing": {
        "iocs": ["high-volume failed logins from a single source IP on {endpoint}"],
        "behaviour": "automated credential stuffing using breached credential lists",
        "rule": "alert when failed logins from one source IP exceed 10/minute on authentication endpoints",
        "confidence": 0.9,
    },
    "SQL Injection": {
        "iocs": ["repeated malformed SQL queries on {endpoint}"],
        "behaviour": "SQL injection probing for data access or privilege escalation",
        "rule": "monitor repeated malformed SQL queries on API endpoints",
        "confidence": 0.85,
    },
}
DEFAULT_KNOWLEDGE = {
    "iocs": ["anomalous request patterns on {endpoint}"],
    "behaviour": "unclassified suspicious activity",
    "rule": "review anomalous request patterns on the affected endpoint",
    "confidence": 0.5,
}

def sanitize_report(incident):
    """Whitelist projection — raw_log, payloads and narratives NEVER leave the org."""
    k = ATTACK_KNOWLEDGE.get(incident["attack_type"], DEFAULT_KNOWLEDGE)
    endpoint = incident.get("raw_log", {}).get("endpoint", "unknown endpoint")
    return {
        "source_org": incident["source_org"],
        "attack_type": incident["attack_type"],
        "mitre_technique": incident["mitre_technique"],
        "timestamp": incident["timestamp"],
        "attacker_infrastructure": {
            "source_ip": incident["attacker_infrastructure"]["source_ip"],
            "asn_or_host": "unknown/demo",
            "approx_geolocation": "unknown/demo",
        },
        "indicators_of_compromise": [scrub(i.format(endpoint=endpoint)) for i in k["iocs"]],
        "observed_behaviour": scrub(k["behaviour"]),
        "recommended_detection_rule": scrub(k["rule"]),
        "confidence": k["confidence"],
    }

def submit_to_master(report):
    try:
        r = requests.post(f"{MASTER_URL}/reports", json=report, timeout=5)
        return r.status_code == 200
    except requests.RequestException:
        return False

class AttackLog(BaseModel):
    timestamp: str
    source_ip: str
    endpoint: str
    attack_type: str
    request_payload: str
    response_code: int

MITRE_MAP = {
    "Credential Stuffing": "T1110.004",
    "SQL Injection": "T1190"
}

@app.get("/health")
def health():
    return {"status": f"{ORG_ID} is running"}

@app.post("/ingest")
def ingest_log(log: AttackLog):
    technique_id = MITRE_MAP.get(log.attack_type, "Unknown")

    prompt = f"""You are a cybersecurity forensic analyst. Convert this raw attack log into a short, clear, human-readable incident summary (2-3 sentences). Be factual, no speculation.

Raw log:
Timestamp: {log.timestamp}
Source IP: {log.source_ip}
Endpoint targeted: {log.endpoint}
Attack type: {log.attack_type}
Payload: {log.request_payload}
Response code: {log.response_code}

Write only the summary, nothing else."""

    response = requests.post(
        "http://host.docker.internal:11434/api/generate",
        json={"model": "qwen2.5-coder:7b", "prompt": prompt, "stream": False}
    )
    narrative = response.json().get("response", "Error generating narrative")

    incident = {
        "source_org": ORG_ID,
        "attack_type": log.attack_type,
        "mitre_technique": technique_id,
        "timestamp": log.timestamp,
        "attacker_infrastructure": {
            "source_ip": log.source_ip
        },
        "raw_log": log.dict(),
        "ai_narrative": narrative
    }

    save_incident(incident)
    shared = submit_to_master(sanitize_report(incident))
    return {**incident, "shared_with_master": shared}

@app.get("/incidents")
def get_incidents():
    return load_incidents()

@app.get("/sanitized")
def get_sanitized():
    """What this org actually shares — for the privacy before/after demo."""
    return [sanitize_report(i) for i in load_incidents()]

@app.post("/sync_reports")
def sync_reports():
    """Backfill: push sanitized reports for all stored incidents to master-ai."""
    incidents = load_incidents()
    sent = sum(1 for i in incidents if submit_to_master(sanitize_report(i)))
    return {"org": ORG_ID, "reports_sent": sent, "total_incidents": len(incidents)}

@app.get("/verify")
def verify_chain():
    incidents = load_incidents()
    prev = GENESIS
    blocks = []
    chain_valid = True
    for idx, inc in enumerate(incidents):
        ev = inc.get("evidence", {})
        recomputed = compute_block_hash(prev, idx, canonical_content(inc))
        content_intact = recomputed == ev.get("block_hash")
        link_intact = ev.get("prev_hash") == prev
        valid = content_intact and link_intact
        chain_valid = chain_valid and valid
        blocks.append({
            "block_index": idx,
            "timestamp": inc.get("timestamp"),
            "attack_type": inc.get("attack_type"),
            "block_hash": ev.get("block_hash", ""),
            "prev_hash": ev.get("prev_hash", ""),
            "content_intact": content_intact,
            "link_intact": link_intact,
            "status": "VALID" if valid else "TAMPERED",
        })
        prev = ev.get("block_hash", recomputed)
    return {
        "org": ORG_ID,
        "chain_valid": chain_valid,
        "block_count": len(blocks),
        "blocks": blocks,
    }
@app.get("/lookup")
def lookup_identifier(identifier: str):
    incidents = load_incidents()
    identifier_lower = identifier.strip().lower()
    matches = []
    for inc in incidents:
        payload = str(inc.get("raw_log", {}).get("request_payload", "")).lower()
        if identifier_lower and identifier_lower in payload:
            matches.append({
                "org": ORG_ID,
                "attack_type": inc["attack_type"],
                "timestamp": inc["timestamp"],
                "endpoint": inc.get("raw_log", {}).get("endpoint", "unknown"),
            })
    return {"org": ORG_ID, "exposed": len(matches) > 0, "matches": matches}