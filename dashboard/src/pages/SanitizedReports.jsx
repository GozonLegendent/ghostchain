import { useMemo, useState } from "react";
import { FileText, Filter, RefreshCw, Building2 } from "lucide-react";
import { useAllReports } from "../api";
import { useAuth, ROLES } from "../auth";
import Page from "../components/Page";
import HudPanel from "../components/HudPanel";
import DecryptedText from "../components/DecryptedText";

function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SanitizedReports() {
  const { role } = useAuth();
  const { reports, loading, error, refresh } = useAllReports();
  const [attackFilter, setAttackFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState(null);

  const attackTypes = useMemo(
    () => ["ALL", ...new Set(reports.map((r) => r.attack_type))],
    [reports]
  );

  const filtered = useMemo(() => {
    return reports
      .filter((r) => attackFilter === "ALL" || r.attack_type === attackFilter)
      .filter((r) => !dateFrom || new Date(r.timestamp) >= new Date(dateFrom))
      .filter((r) => !dateTo || new Date(r.timestamp) <= new Date(dateTo))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [reports, attackFilter, dateFrom, dateTo]);

  const rowKey = (r, i) => `${r.source_org}|${r.timestamp}|${i}`;

  return (
    <Page className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-300">
          <DecryptedText text="// SANITIZED REPORT LEDGER" />
        </h1>
        <button
          onClick={refresh}
          className="cut-corner font-display flex items-center gap-2 bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="font-mono text-[11px] text-slate-500 -mt-2">
        every sanitized report shared across the network · no raw logs, payloads, or narratives · visible to all orgs and authority
      </p>

      {error && (
        <div className="border border-rose-500/40 bg-rose-500/5 text-rose-300 text-sm font-mono p-3 cut-corner">
          // master-ai unreachable: {error}
        </div>
      )}

      <HudPanel title="// FILTERS" icon={Filter}>
        <div className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <label className="block font-mono text-[10px] uppercase text-slate-500 mb-1">Attack Type</label>
            <select
              value={attackFilter}
              onChange={(e) => setAttackFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 focus:border-cyan-400/60 outline-none px-3 py-2 font-mono text-xs text-slate-200 cut-corner"
            >
              {attackTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 focus:border-cyan-400/60 outline-none px-3 py-2 font-mono text-xs text-slate-200 cut-corner"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 focus:border-cyan-400/60 outline-none px-3 py-2 font-mono text-xs text-slate-200 cut-corner"
            />
          </div>
          {(attackFilter !== "ALL" || dateFrom || dateTo) && (
            <button
              onClick={() => { setAttackFilter("ALL"); setDateFrom(""); setDateTo(""); }}
              className="font-mono text-[11px] text-slate-500 hover:text-cyan-300 underline"
            >
              clear filters
            </button>
          )}
          <span className="font-mono text-[11px] text-slate-500 ml-auto">
            {filtered.length} of {reports.length} reports
          </span>
        </div>
      </HudPanel>

      <HudPanel title="// REPORTS" icon={FileText}>
        {loading ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            // no sanitized reports match these filters
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((r, i) => {
              const key = rowKey(r, i);
              const isMine = role !== ROLES.AUTHORITY && r.source_org === role;
              const isOpen = expanded === key;
              return (
                <div key={key}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className={`w-full flex items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-800/40 ${
                      isMine ? "bg-cyan-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-mono text-xs text-cyan-200 shrink-0">
                        {r.source_org.toUpperCase()}
                      </span>
                      {isMine && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded shrink-0">
                          YOUR ORG
                        </span>
                      )}
                      <span className="font-mono text-xs text-red-400 shrink-0">{r.attack_type}</span>
                      <span className="font-mono text-[11px] text-slate-500 truncate hidden sm:inline">
                        {r.mitre_technique}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0">{fmtTime(r.timestamp)}</span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 font-mono text-[11px]">
                      <div className="border border-slate-800 bg-[#05070c] p-3">
                        <p className="text-slate-500 uppercase text-[9px] mb-1">Observed Behaviour</p>
                        <p className="text-slate-300">{r.observed_behaviour}</p>
                      </div>
                      <div className="border border-slate-800 bg-[#05070c] p-3">
                        <p className="text-slate-500 uppercase text-[9px] mb-1">Indicators of Compromise</p>
                        {(r.indicators_of_compromise ?? []).map((ioc, idx) => (
                          <p key={idx} className="text-slate-300">• {ioc}</p>
                        ))}
                      </div>
                      <div className="border border-slate-800 bg-[#05070c] p-3">
                        <p className="text-slate-500 uppercase text-[9px] mb-1">Recommended Detection Rule</p>
                        <p className="text-slate-300">{r.recommended_detection_rule}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="border border-slate-800 bg-[#05070c] p-3 flex-1">
                          <p className="text-slate-500 uppercase text-[9px] mb-1">Source IP</p>
                          <p className="text-cyan-300">{r.attacker_infrastructure?.source_ip}</p>
                        </div>
                        <div className="border border-slate-800 bg-[#05070c] p-3 flex-1">
                          <p className="text-slate-500 uppercase text-[9px] mb-1">Confidence</p>
                          <p className="text-cyan-300">{(r.confidence * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </HudPanel>
    </Page>
  );
}