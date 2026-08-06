import { useState } from "react";
import { motion } from "motion/react";
import { Terminal, Cpu, ShieldCheck } from "lucide-react";
import { useIncidents } from "../api";
import Page from "../components/Page";
import HudPanel from "../components/HudPanel";
import DecryptedText from "../components/DecryptedText";
import TypeText from "../components/TypeText";

const keyOf = (i) => `${i.source_org}|${i.timestamp}|${i.raw_log?.request_payload}`;

export default function LiveIncidents() {
  const incidents = useIncidents();
  const [selKey, setSelKey] = useState(null);
  const selected = incidents.find((i) => keyOf(i) === selKey) ?? incidents[0] ?? null;

  return (
    <Page className="space-y-4 p-4">
      <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-400">
        <DecryptedText text="// LIVE INCIDENT FEED" />
      </h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HudPanel
          title="Raw Attack Logs"
          icon={Terminal}
          right={<span className="cut-corner bg-red-500/10 px-2 py-0.5 font-mono text-[10px] text-red-400">LIVE</span>}
        >
          <div className="max-h-[72vh] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
            {incidents.length === 0 ? (
              <p className="text-slate-600">// awaiting incoming node telemetry…</p>
            ) : null}
            {incidents.map((inc) => (
              <motion.div
                key={keyOf(inc) + inc.ai_narrative?.slice(0, 20)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => setSelKey(keyOf(inc))}
                className={`mb-1 cursor-pointer rounded px-2 py-1 transition-transform hover:translate-x-1 hover:bg-slate-800/60 ${
                  selected && keyOf(selected) === keyOf(inc) ? "bg-slate-800" : ""
                }`}
              >
                <span className="text-slate-500">[{inc.timestamp}]</span>{" "}
                <span className="text-cyan-400">{inc.source_org?.toUpperCase()}</span>{" "}
                <span className="text-red-400">{inc.attack_type}</span>{" "}
                <span className="text-slate-400">
                  src_ip={inc.attacker_infrastructure?.source_ip} → {inc.raw_log?.endpoint}
                </span>
              </motion.div>
            ))}
            <p className="mt-1 px-2 text-emerald-500">
              ▸ listening<span className="cursor-blink text-cyan-400">▌</span>
            </p>
          </div>
        </HudPanel>

        <HudPanel title="AI Forensic Narrator" icon={Cpu}>
          {selected === null ? (
            <p className="p-6 text-sm text-slate-600">Select an incident to view its forensic report.</p>
          ) : (
            <div className="space-y-4 p-4">
              <div>
                <p className="font-mono text-[10px] uppercase text-slate-500">Attack Type</p>
                <span className="cut-corner mt-1 inline-block bg-red-500/10 px-2 py-1 font-mono text-xs text-red-400">
                  {selected.attack_type}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <InfoCard label="MITRE Technique" value={selected.mitre_technique} mono accent />
                <InfoCard label="Source Org" value={selected.source_org} badge="✓ VERIFIED" />
                <InfoCard label="Timestamp" value={selected.timestamp} mono small />
              </div>
              <div className="border border-slate-800 bg-[#05070c] p-4">
                <p className="mb-2 font-mono text-[10px] uppercase text-cyan-400">◆ Incident Narrative</p>
                <p className="text-sm leading-relaxed text-slate-200">
                    <TypeText key={keyOf(selected)} text={selected.ai_narrative ?? ""} />
                </p>
              </div>
              <button className="cut-corner font-display flex w-full items-center justify-center gap-2 bg-cyan-500 py-2.5 text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400">
                <ShieldCheck className="h-4 w-4" /> Verify Evidence Integrity
              </button>
              <p className="text-center font-mono text-[10px] text-slate-600">hash-chain verification arrives in Phase 2</p>
            </div>
          )}
        </HudPanel>
      </div>
    </Page>
  );
}

function InfoCard({ label, value, badge, mono, small, accent }) {
  return (
    <div className="border border-slate-800 bg-[#05070c] p-3">
      <p className="font-mono text-[10px] uppercase text-slate-500">{label}</p>
      <p className={`mt-1 ${mono ? "font-mono" : ""} ${small ? "text-xs" : "text-sm"} ${accent ? "text-cyan-400" : ""}`}>
        {value} {badge ? <span className="text-[10px] text-emerald-400">{badge}</span> : null}
      </p>
    </div>
  );
}