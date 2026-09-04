from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import os
import re
import hashlib
import numpy as np
from sklearn.linear_model import LogisticRegression

from auth import create_token, require_role
from shared.merkle import MerkleTree, leaf_hash

ORG_ID = "org_c"
GENESIS = "0" * 64
MASTER_URL = "http://master-ai:8000"

ORG_USERNAME = os.environ.get("ORG_USERNAME", "org_c")
ORG_PASSWORD = os.environ.get("ORG_PASSWORD", "changeme_c")

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


def submit_for_custody(incident):
    """
    Bundles the evidence hash-chain block for THIS incident with the FULL RAW
    incident and submits both to master-ai's custody queue. The raw incident
    -- not a sanitized version -- travels here. Sanitization now happens on
    master-ai's side, inside the AI Forensic Narrator, only after approval.
    """
    block = incident["evidence"]
    payload = {
        "org_id": ORG_ID,
        "blocks": [block],
        "raw_incident": incident,
    }
    try:
        r = requests.post(f"{MASTER_URL}/custody/submit", json=payload, timeout=5)
        if r.status_code == 200:
            return r.json()
        return None
    except requests.RequestException:
        return None


class AttackLog(BaseModel):
    timestamp: str
    source_ip: str
    endpoint: str
    attack_type: str
    request_payload: str
    response_code: int


class LoginRequest(BaseModel):
    username: str
    password: str


class ProofRequest(BaseModel):
    leaf_hash: str


MITRE_MAP = {
    "Credential Stuffing": "T1110.004",
    "SQL Injection": "T1190",
}


@app.get("/health")
def health():
    return {"status": f"{ORG_ID} is running"}


@app.post("/login")
def login(req: LoginRequest):
    if req.username == ORG_USERNAME and req.password == ORG_PASSWORD:
        return {"token": create_token(ORG_ID), "role": ORG_ID}
    raise HTTPException(status_code=401, detail="invalid credentials")


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

    custody_result = submit_for_custody(incident)
    incident["custody_submission"] = custody_result

    return {
        **incident,
        "pending_authority_review": custody_result is not None,
        "submission_id": custody_result.get("submission_id") if custody_result else None,
    }


@app.get("/incidents")
def get_incidents(_=Depends(require_role(ORG_ID))):
    return load_incidents()


@app.get("/sanitized")
def get_sanitized():
    return [sanitize_report(i) for i in load_incidents()]


@app.post("/sync_reports")
def sync_reports():
    """Backfill: submit sanitized reports for all stored incidents into the
    same custody review queue as /ingest. No bypass path exists anymore."""
    incidents = load_incidents()
    submitted = 0
    for inc in incidents:
        if "evidence" not in inc:
            continue
        result = submit_for_custody(inc)
        if result:
            submitted += 1
    return {"org": ORG_ID, "submissions_created": submitted, "total_incidents": len(incidents)}


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


# ---- PHASE 4: Merkle non-membership commitments ----

def build_org_tree():
    incidents = load_incidents()
    ips = [i["raw_log"]["source_ip"] for i in incidents if i.get("raw_log", {}).get("source_ip")]
    leaves = [leaf_hash(ip) for ip in ips]
    return MerkleTree(leaves)


@app.get("/commit")
def get_commitment():
    tree = build_org_tree()
    return {"org": ORG_ID, "root": tree.root, "leaf_count": len(set(tree.leaves))}


@app.post("/prove")
def get_proof(req: ProofRequest):
    tree = build_org_tree()
    found, path = tree.proof_for(req.leaf_hash)
    return {
        "org": ORG_ID,
        "root": tree.root,
        "leaf_hash": req.leaf_hash,
        "present": found,
        "path": path,
    }


# ---- PHASE 5: Federated Learning ----

ENDPOINT_MAP = {
    "/api/v1/login": 0,
    "/api/v1/checkout": 1,
    "/api/v1/search": 2,
    "/api/v1/profile": 3,
    "/api/v1/admin": 4,
}


def featurize(incident):
    raw = incident.get("raw_log", {})
    ep = ENDPOINT_MAP.get(raw.get("endpoint"), 5)
    code = raw.get("response_code", 0)
    payload_len = len(str(raw.get("request_payload", "")))
    return [ep, code, payload_len]


@app.post("/train_local_model")
def train_local_model():
    """
    Trains a small logistic regression classifier on THIS org's own incidents
    (attack_type prediction from request features). Returns and submits only
    the trained weights -- never the underlying incident data.
    """
    incidents = load_incidents()
    if len(incidents) < 2:
        return {"org": ORG_ID, "trained": False, "reason": "not enough incidents"}

    X = np.array([featurize(i) for i in incidents])
    y = np.array([i["attack_type"] for i in incidents])

    if len(set(y)) < 2:
        return {"org": ORG_ID, "trained": False, "reason": "only one class present, cannot train classifier"}

    clf = LogisticRegression(max_iter=1000)
    clf.fit(X, y)

    weights = {
        "org": ORG_ID,
        "trained": True,
        "sample_count": len(incidents),
        "coef": clf.coef_.tolist(),
        "intercept": clf.intercept_.tolist(),
        "classes": clf.classes_.tolist(),
    }

    try:
        requests.post(f"{MASTER_URL}/federated/submit_weights", json=weights, timeout=10)
    except requests.RequestException:
        pass

    return weights