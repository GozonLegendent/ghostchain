from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import os

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

def save_incident(incident):
    incidents = load_incidents()
    incidents.append(incident)
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(incidents, f, indent=2)

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
    return {"status": "org-c is running"}

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
        "source_org": "org_c",
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
    return incident

@app.get("/incidents")
def get_incidents():
    return load_incidents()