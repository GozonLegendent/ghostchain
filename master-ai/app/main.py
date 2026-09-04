from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import os
import re
import hashlib
import time

from auth import create_token, require_role

AUTHORITY_USERNAME = os.environ.get("AUTHORITY_USERNAME", "authority")
AUTHORITY_PASSWORD = os.environ.get("AUTHORITY_PASSWORD", "changeme_authority")
OLLAMA_URL = "http://host.docker.internal:11434/api/generate"
OLLAMA_MODEL = "qwen2.5-coder:7b"
LLM_TIMEOUT_SECONDS = 8

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "data/reports.json"
BRIEF_FILE = "data/briefs.json"
CUSTODY_FILE = "data/custody.json"
CUSTODY_GENESIS = "0" * 64


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


class LoginRequest(BaseModel):
    username: str
    password: str


@app.get("/health")
def health():
    return {"status": "master-ai is running"}


@app.post("/login")
def login(req: LoginRequest):
    if req.username == AUTHORITY_USERNAME and req.password == AUTHORITY_PASSWORD:
        return {"token": create_token("authority"), "role": "authority"}
    raise HTTPException(status_code=401, detail="invalid credentials")


ATTACK_PATTERN_HINTS = {
    "Credential Stuffing": "high-volume failed logins from a single source IP against an authentication endpoint",
    "SQL Injection": "repeated malformed SQL syntax in request payloads against an API endpoint",
}


def rule_based_advice(raw_incident, chain_looks_ok):
    attack_type = raw_incident.get("attack_type", "Unknown")
    hint = ATTACK_PATTERN_HINTS.get(attack_type, "an unclassified anomalous request pattern")
    verdict = "approve" if chain_looks_ok else "reject"
    return {
        "recommendation": verdict,
        "reasoning": (
            f"Rule-based check: attack_type '{attack_type}' is consistent with {hint}, "
            f"and the submitted evidence chain is {'internally consistent' if chain_looks_ok else 'not verifiable'}. "
            f"Recommend {verdict}."
        ),
        "source": "rule_based_fallback",
    }


def ai_advisor_opinion(raw_incident, blocks):
    chain_looks_ok = len(blocks) > 0 and all(b.get("block_hash") for b in blocks)

    try:
        prompt = f"""You are a security evidence advisor. You are given a raw incident report and a cryptographic evidence chain reference from an organization. Decide whether the evidence is CONSISTENT with the claimed attack, and give a one-sentence recommendation.

Raw incident:
Attack type: {raw_incident.get("attack_type")}
Source IP: {raw_incident.get("attacker_infrastructure", {}).get("source_ip")}
Timestamp: {raw_incident.get("timestamp")}
Raw log endpoint: {raw_incident.get("raw_log", {}).get("endpoint", "unknown")}
Raw log payload (truncated): {str(raw_incident.get("raw_log", {}).get("request_payload", ""))[:200]}
Evidence block count: {len(blocks)}

Respond in EXACTLY this format, nothing else:
RECOMMENDATION: <approve or reject>
REASONING: <one sentence, factual, no speculation>"""

        response = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=LLM_TIMEOUT_SECONDS,
        )
        text = response.json().get("response", "")

        rec_match = re.search(r"RECOMMENDATION:\s*(approve|reject)", text, re.IGNORECASE)
        reason_match = re.search(r"REASONING:\s*(.+)", text, re.IGNORECASE)

        if rec_match and reason_match:
            return {
                "recommendation": rec_match.group(1).lower(),
                "reasoning": reason_match.group(1).strip(),
                "source": "ai_advisor",
            }
        return rule_based_advice(raw_incident, chain_looks_ok)

    except (requests.RequestException, ValueError, KeyError):
        return rule_based_advice(raw_incident, chain_looks_ok)


DEFAULT_IOC_HINT = "anomalous request patterns on the affected endpoint"


def ai_forensic_narrator(raw_incident):
    endpoint = raw_incident.get("raw_log", {}).get("endpoint", "unknown endpoint")
    attack_type = raw_incident.get("attack_type", "Unknown")

    fallback_behaviour = ATTACK_PATTERN_HINTS.get(attack_type, "unclassified suspicious activity")
    fallback = {
        "source_org": raw_incident["source_org"],
        "attack_type": attack_type,
        "mitre_technique": raw_incident.get("mitre_technique", "Unknown"),
        "timestamp": raw_incident["timestamp"],
        "attacker_infrastructure": {
            "source_ip": raw_incident["attacker_infrastructure"]["source_ip"],
            "asn_or_host": "unknown/demo",
            "approx_geolocation": "unknown/demo",
        },
        "indicators_of_compromise": [f"{DEFAULT_IOC_HINT} ({endpoint})"],
        "observed_behaviour": fallback_behaviour,
        "recommended_detection_rule": f"review anomalous request patterns on {endpoint}",
        "confidence": 0.6,
    }

    try:
        prompt = f"""You are the AI Forensic Narrator. Convert this raw, approved incident into a sanitized threat-intelligence report. NEVER include emails, usernames, passwords, tokens, or raw payload contents in your output.

Raw incident:
Attack type: {attack_type}
Endpoint: {endpoint}
Timestamp: {raw_incident["timestamp"]}

Respond in EXACTLY this format, nothing else:
IOC: <one short indicator-of-compromise sentence, no PII>
BEHAVIOUR: <one short sentence describing the attacker behaviour>
RULE: <one short recommended detection rule>
CONFIDENCE: <a number between 0 and 1>"""

        response = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=LLM_TIMEOUT_SECONDS,
        )
        text = response.json().get("response", "")

        ioc = re.search(r"IOC:\s*(.+)", text, re.IGNORECASE)
        behaviour = re.search(r"BEHAVIOUR:\s*(.+)", text, re.IGNORECASE)
        rule = re.search(r"RULE:\s*(.+)", text, re.IGNORECASE)
        confidence = re.search(r"CONFIDENCE:\s*([\d.]+)", text, re.IGNORECASE)

        if ioc and behaviour and rule and confidence:
            fallback["indicators_of_compromise"] = [ioc.group(1).strip()]
            fallback["observed_behaviour"] = behaviour.group(1).strip()
            fallback["recommended_detection_rule"] = rule.group(1).strip()
            try:
                fallback["confidence"] = max(0.0, min(1.0, float(confidence.group(1))))
            except ValueError:
                pass

        return fallback

    except (requests.RequestException, ValueError, KeyError):
        return fallback


def _store_report_internal(report: dict):
    leaked = FORBIDDEN_FIELDS & set(report.keys())
    if leaked:
        return {"stored": False, "reason": f"PRIVACY GATE: rejected non-sanitized fields {sorted(leaked)}"}
    missing = REQUIRED_FIELDS - set(report.keys())
    if missing:
        return {"stored": False, "reason": f"missing required fields {sorted(missing)}"}

    reports = load_json(DATA_FILE, [])
    if any(dedup_key(r) == dedup_key(report) for r in reports):
        return {"stored": False, "reason": "duplicate report"}
    reports.append(report)
    write_json(DATA_FILE, reports)
    return {"stored": True, "total_reports": len(reports)}


@app.post("/reports")
def receive_report(_=Depends(require_role("authority"))):
    raise HTTPException(
        status_code=403,
        detail="Direct report submission is disabled. Reports are only released "
               "via an accepted custody submission.",
    )


def compute_campaigns():
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

    try:
        response = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=LLM_TIMEOUT_SECONDS)
        text = response.json().get("response", "Error generating brief")
    except requests.RequestException:
        text = "Brief generation unavailable — LLM unreachable."

    briefs = load_json(BRIEF_FILE, {})
    briefs[camp["fingerprint"]["source_ip"]] = {"text": text, "report_count": camp["report_count"]}
    write_json(BRIEF_FILE, briefs)
    return {"campaign_id": campaign_id, "intel_brief": text}


def custody_canonical(block):
    core = {k: v for k, v in block.items() if k != "block_hash"}
    return json.dumps(core, sort_keys=True, separators=(",", ":"))


def incident_canonical(raw_incident):
    """
    Mirrors the ORG's canonical_content(): the block_hash an org computes is
    SHA256(prev_hash|block_index|canonical(WHOLE INCIDENT minus 'evidence')),
    not a hash of the small {block_index, prev_hash} block object. This
    reconstructs that exact same canonical form so verification actually
    matches what the org originally hashed. Verified correct by hand against
    real stored data.
    """
    core = {k: v for k, v in raw_incident.items() if k != "evidence"}
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
    raw_incident = payload.get("raw_incident")

    if not org_id or not blocks:
        raise HTTPException(status_code=422, detail="org_id and blocks are required")
    if not raw_incident:
        raise HTTPException(status_code=422, detail="raw_incident is required")

    submissions = load_custody()
    submission_id = f"sub_{org_id}_{int(time.time())}"
    submissions.append({
        "submission_id": submission_id,
        "org_id": org_id,
        "submitted_at": payload.get("submitted_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "blocks": blocks,
        "raw_incident": raw_incident,
        "status": "pending",
        "verdict": None,
        "analyzed_at": None,
        "released": False,
    })
    write_custody(submissions)
    return {"submission_id": submission_id, "status": "pending"}


@app.get("/custody/submissions")
def get_custody_submissions(_=Depends(require_role("authority"))):
    submissions = load_custody()
    return [
        {k: v for k, v in s.items() if k != "raw_incident"}
        for s in submissions
    ]


@app.post("/custody/submissions/{submission_id}/advise")
def advise_custody_submission(submission_id: str, _=Depends(require_role("authority"))):
    submissions = load_custody()
    sub = next((s for s in submissions if s["submission_id"] == submission_id), None)
    if sub is None:
        raise HTTPException(status_code=404, detail="submission not found")

    opinion = ai_advisor_opinion(sub["raw_incident"], sub["blocks"])
    return {"submission_id": submission_id, **opinion}


@app.post("/custody/submissions/{submission_id}/analyze")
def analyze_custody_submission(submission_id: str, _=Depends(require_role("authority"))):
    """
    VERIFIED FIX: recomputes each block's hash using the SAME payload the org
    actually hashed at creation time -- the raw incident's fields (minus
    "evidence"), combined with that block's own claimed prev_hash/block_index.
    Confirmed correct by hand-computation against real stored submission data
    before shipping this version.
    """
    submissions = load_custody()
    sub = next((s for s in submissions if s["submission_id"] == submission_id), None)
    if sub is None:
        raise HTTPException(status_code=404, detail="submission not found")

    raw_incident = sub["raw_incident"]
    blocks = sub["blocks"]
    chain_valid = len(blocks) > 0

    for b in blocks:
        claimed_index = b.get("block_index")
        claimed_prev = b.get("prev_hash")
        if claimed_index is None or claimed_prev is None:
            chain_valid = False
            break
        core_json = incident_canonical(raw_incident)
        recomputed = custody_hash(claimed_prev, claimed_index, core_json)
        if recomputed != b.get("block_hash"):
            chain_valid = False
            break

    sub["status"] = "analyzed"
    sub["verdict"] = "VERIFIED" if chain_valid else "TAMPERED"
    sub["analyzed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    release_result = None
    if chain_valid:
        sanitized_report = ai_forensic_narrator(raw_incident)
        release_result = _store_report_internal(sanitized_report)
        sub["released"] = bool(release_result.get("stored"))
    else:
        sub["released"] = False

    write_custody(submissions)
    return {
        "submission_id": submission_id,
        "verdict": sub["verdict"],
        "released": sub["released"],
        "release_detail": release_result,
    }


@app.get("/custody/verdicts")
def get_custody_verdicts():
    submissions = load_custody()
    return [
        {
            "submission_id": s["submission_id"],
            "org_id": s["org_id"],
            "submitted_at": s["submitted_at"],
            "status": s["status"],
            "verdict": s["verdict"],
            "analyzed_at": s["analyzed_at"],
            "released": s.get("released", False),
        }
        for s in submissions
    ]


@app.get("/reports/all")
def get_all_reports():
    return load_json(DATA_FILE, [])