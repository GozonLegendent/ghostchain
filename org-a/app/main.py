from fastapi import FastAPI
from pydantic import BaseModel
import requests

app = FastAPI()

class AttackLog(BaseModel):
    timestamp: str
    source_ip: str
    endpoint: str
    attack_type: str
    request_payload: str
    response_code: int

# Simple lookup table — expand later if you add more attack types
MITRE_MAP = {
    "Credential Stuffing": "T1110.004",
    "SQL Injection": "T1190"
}

@app.get("/health")
def health():
    return {"status": "org-a is running"}

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

    return {
        "source_org": "org_a",
        "attack_type": log.attack_type,
        "mitre_technique": technique_id,
        "timestamp": log.timestamp,
        "attacker_infrastructure": {
            "source_ip": log.source_ip
        },
        "raw_log": log.dict(),
        "ai_narrative": narrative
    }