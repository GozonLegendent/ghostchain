SANITIZED_REPORT_EXAMPLE = {
    "campaign_id": "camp_2026_08_04_001",
    "source_org": "org_a",
    "attack_type": "SQL Injection",
    "mitre_technique": "T1190",
    "timestamp": "2026-08-04T23:14:00Z",
    "attacker_infrastructure": {
        "source_ip": "203.0.113.42",
        "asn_or_host": "example-hosting-provider",
        "approx_geolocation": "unknown/example"
    },
    "indicators_of_compromise": [
        "repeated malformed SQL queries on /api/v1/auth"
    ],
    "observed_behaviour": "privilege escalation attempt",
    "recommended_detection_rule": "monitor repeated malformed SQL queries on auth endpoints",
    "confidence": 0.9
}