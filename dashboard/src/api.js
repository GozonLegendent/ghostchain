import { useEffect, useState } from "react";

export const ORGS = [
  { id: "org_a", name: "Org A", url: "http://localhost:8001" },
  { id: "org_b", name: "Org B", url: "http://localhost:8002" },
  { id: "org_c", name: "Org C", url: "http://localhost:8004" },
];

export function useIncidents(pollMs = 5000) {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    let alive = true;
    async function fetchAll() {
      const results = await Promise.allSettled(
        ORGS.map((o) => fetch(`${o.url}/incidents`).then((r) => r.json()))
      );
      if (!alive) return;
      const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setIncidents(all);
    }
    fetchAll();
    const t = setInterval(fetchAll, pollMs);
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