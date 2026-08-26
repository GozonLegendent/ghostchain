import { useEffect, useState, useCallback } from "react";
import { checkExposureAgainstOrg } from "./merkleAudit";

export const ORGS = [
  { id: "org_a", name: "Org A", url: "http://localhost:8001" },
  { id: "org_b", name: "Org B", url: "http://localhost:8002" },
  { id: "org_c", name: "Org C", url: "http://localhost:8004" },
];

export const MASTER_URL = "http://localhost:8003";

const ROLE_KEY = "ghostchain_role";
const TOKEN_KEY = "ghostchain_token";

function getRole() {
  return localStorage.getItem(ROLE_KEY);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---- Org-scoped raw incidents ----
// Each org's /incidents now requires that org's own bearer token (role must
// match the org id). No org can see another org's raw incidents, and
// Authority never sees raw incidents at all — only sanitized reports.

export function useIncidents(pollMs = 5000) {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    let alive = true;
    async function fetchMine() {
      const role = getRole();
      const org = ORGS.find((o) => o.id === role);
      if (!org) {
        // Authority (or logged out) has no raw-incident visibility.
        if (alive) setIncidents([]);
        return;
      }
      try {
        const res = await fetch(`${org.url}/incidents`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          : [];
        setIncidents(sorted);
      } catch {
        if (alive) setIncidents([]);
      }
    }
    fetchMine();
    const t = setInterval(fetchMine, pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [pollMs]);

  return incidents;
}

export async function verifyAll() {
  const settled = await Promise.allSettled(
    ORGS.map((o) => fetch(`${o.url}/verify`).then((r) => r.json()))
  );
  return ORGS.map((o, i) => ({
    org: o,
    data: settled[i].status === "fulfilled" ? settled[i].value : null,
  }));
}

// ---- PHASE 3: Threat Campaigns (Master AI correlation) — public, sanitized ----

export function useCampaigns(pollMs = 5000) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`${MASTER_URL}/campaigns`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (!alive) return;
      await fetchCampaigns();
    }
    tick();
    const t = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [fetchCampaigns, pollMs]);

  return { campaigns, loading, error, refresh: fetchCampaigns };
}

export async function generateBrief(campaignId) {
  const res = await fetch(`${MASTER_URL}/campaigns/${campaignId}/brief`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`brief generation failed: HTTP ${res.status}`);
  return res.json();
}

// ---- FEATURE 1: Flat sanitized report ledger (public, all orgs + Authority) ----

export function useAllReports(pollMs = 5000) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${MASTER_URL}/reports/all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (!alive) return;
      await fetchReports();
    }
    tick();
    const t = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [fetchReports, pollMs]);

  return { reports, loading, error, refresh: fetchReports };
}

// ---- FEATURE 3: Zero-Knowledge Chain-of-Custody ----
// /custody/submit and /custody/verdicts are public.
// /custody/submissions and .../analyze require an Authority bearer token.

export async function submitCustody(orgId, blocks) {
  const res = await fetch(`${MASTER_URL}/custody/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org_id: orgId, blocks }),
  });
  if (!res.ok) throw new Error(`custody submit failed: HTTP ${res.status}`);
  return res.json();
}

export function useCustodySubmissions(pollMs = 5000) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch(`${MASTER_URL}/custody/submissions`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (!alive) return;
      await fetchSubs();
    }
    tick();
    const t = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [fetchSubs, pollMs]);

  return { submissions, loading, error, refresh: fetchSubs };
}

export async function analyzeCustodySubmission(submissionId) {
  const res = await fetch(`${MASTER_URL}/custody/submissions/${submissionId}/analyze`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`analyze failed: HTTP ${res.status}`);
  return res.json();
}

export function useVerdicts(pollMs = 5000) {
  const [verdicts, setVerdicts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVerdicts = useCallback(async () => {
    try {
      const res = await fetch(`${MASTER_URL}/custody/verdicts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVerdicts(Array.isArray(data) ? data : []);
    } catch {
      setVerdicts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function tick() {
      if (!alive) return;
      await fetchVerdicts();
    }
    tick();
    const t = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [fetchVerdicts, pollMs]);

  return { verdicts, loading, refresh: fetchVerdicts };
}

// ---- Personal Right-to-Audit lookup — public, no login required ----
// PHASE 4: cryptographic non-membership check via Merkle commitments.
// The identifier is hashed client-side and never sent in plaintext.
// Each org only ever returns a root + sibling-hash proof; this browser
// verifies the proof itself and decides exposed/not-exposed locally.



export async function lookupIdentifier(identifier) {
  const settled = await Promise.allSettled(
    ORGS.map((o) => checkExposureAgainstOrg(o.url, identifier))
  );

  return ORGS.map((o, i) => {
    if (settled[i].status !== "fulfilled" || !settled[i].value.reachable) {
      return { org: o, data: null };
    }
    const { exposed, root, leaf } = settled[i].value;
    return {
      org: o,
      data: {
        org: o.id,
        exposed,
        merkle_root: root,
        leaf_hash: leaf,
        matches: [], // no incident detail is ever returned -- proof-only, by design
      },
    };
  });
}