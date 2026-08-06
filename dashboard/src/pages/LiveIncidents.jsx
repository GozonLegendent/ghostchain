import { useState } from "react";
import { useIncidents } from "../api";

const keyOf = (i) => `${i.source_org}|${i.timestamp}|${i.raw_log?.request_payload}`;

export default function LiveIncidents() {
  const incidents = useIncidents();
  const [selKey, setSelKey] = useState(null);
  const selected = incidents.find((i) => keyOf(i) === selKey) ?? incidents[0] ?? null;

  return (
    <main className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-800 bg-[#0d1117]">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">▸ Raw Attack Logs</h2>
          <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">LIVE</span>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
          {incidents.length === 0 ? (
            <p className="text-slate-600">// awaiting incoming node telemetry…</p>
          ) : null}
          {incidents.map((inc) => (
            <div
              key={keyOf(inc) + inc.ai_narrative?.slice(0, 20)}
              onClick={() => setSelKey(keyOf(inc))}
              className={`mb-1 cursor-pointer rounded px-2 py-1 hover:bg-slate-800/60 ${
                selected && keyOf(selected) === keyOf(inc) ? "bg-slate-800" : ""
              }`}
            >
              <span className="text-slate-500">[{inc.timestamp}]</span>{" "}
              <span className="text-cyan-400">{inc.source_org?.toUpperCase()}</span>{" "}
              <span className="text-red-400">{inc.attack_type}</span>{" "}
              <span className="text-slate-400">
                src_ip={inc.attacker_infrastructure?.source_ip} → {inc.raw_log?.endpoint}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-[#0d1117]">
        <div className="border-b border-slate-800 px-4 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">◈ AI Forensic Narrator</h2>
        </div>
        {selected === null ? (
          <p className="p-6 text-sm text-slate-600">Select an incident to view its forensic report.</p>
        ) : (
          <div className="space-y-4 p-4">
            <div>
              <p className="text-[10px] uppercase text-slate-500">Attack Type</p>
              <span className="mt-1 inline-block rounded bg-red-500/10 px-2 py-1 text-xs text-red-400">
                ⚡ {selected.attack_type}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <InfoCard label="MITRE Technique" value={selected.mitre_technique} mono accent />
              <InfoCard label="Source Org" value={selected.source_org} badge="✓ VERIFIED" />
              <InfoCard label="Timestamp" value={selected.timestamp} mono small />
            </div>
            <div className="rounded border border-slate-800 bg-[#0a0e14] p-4">
              <p className="mb-2 text-[10px] uppercase text-cyan-400">◆ Incident Narrative</p>
              <p className="text-sm leading-relaxed text-slate-300">{selected.ai_narrative}</p>
            </div>
            <button className="w-full rounded bg-cyan-500 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400">
              ⛨ Verify Evidence Integrity
            </button>
            <p className="text-center text-[10px] text-slate-600">Hash-chain verification arrives in Phase 2</p>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCard({ label, value, badge, mono, small, accent }) {
  return (
    <div className="rounded border border-slate-800 bg-[#0a0e14] p-3">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className={`mt-1 ${mono ? "font-mono" : ""} ${small ? "text-xs" : "text-sm"} ${accent ? "text-cyan-400" : ""}`}>
        {value} {badge ? <span className="text-[10px] text-emerald-400">{badge}</span> : null}
      </p>
    </div>
  );
}