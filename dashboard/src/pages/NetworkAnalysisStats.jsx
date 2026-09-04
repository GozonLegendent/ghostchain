// NetworkAnalysisStats.jsx
// A new, self-contained section to ADD INTO NetworkAnalysis.jsx, not a
// replacement for it. This avoids touching the existing file's internals
// (which aren't reliably readable right now) while still adding real
// aggregate stats + a lightweight trend view, no 3D, no new backend calls --
// it reuses the same useVerdicts() hook NetworkAnalysis.jsx already has.

import { ShieldCheck, ShieldAlert, Clock, TrendingUp } from "lucide-react";
import HudPanel from "../components/HudPanel";

function StatBlock({ label, value, tone }) {
  const toneClass =
    tone === "verified"
      ? "text-emerald-300 border-emerald-400/40"
      : tone === "tampered"
      ? "text-rose-300 border-rose-500/40"
      : tone === "pending"
      ? "text-amber-300 border-amber-400/40"
      : "text-cyan-300 border-cyan-400/40";

  return (
    <div className={`border rounded p-4 text-center ${toneClass}`}>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest mt-1 opacity-80">
        {label}
      </div>
    </div>
  );
}

/**
 * Drop this component into NetworkAnalysis.jsx's return block, right below
 * the page title / description, passing it the SAME `verdicts` array the
 * page already gets from useVerdicts(). Example:
 *
 *   const { verdicts, loading } = useVerdicts();
 *   ...
 *   <NetworkAnalysisStats verdicts={verdicts} />
 */
export default function NetworkAnalysisStats({ verdicts = [] }) {
  const total = verdicts.length;
  const verified = verdicts.filter((v) => v.verdict === "VERIFIED").length;
  const tampered = verdicts.filter((v) => v.verdict === "TAMPERED").length;
  const pending = verdicts.filter((v) => v.status === "pending").length;
  const released = verdicts.filter((v) => v.released).length;

  const integrityRate = total > 0 ? Math.round((verified / total) * 100) : 0;

  // Group by org for a simple per-org breakdown bar (no charting library needed)
  const byOrg = {};
  verdicts.forEach((v) => {
    if (!byOrg[v.org_id]) byOrg[v.org_id] = { verified: 0, tampered: 0, pending: 0 };
    if (v.status === "pending") byOrg[v.org_id].pending += 1;
    else if (v.verdict === "VERIFIED") byOrg[v.org_id].verified += 1;
    else if (v.verdict === "TAMPERED") byOrg[v.org_id].tampered += 1;
  });

  return (
    <div className="space-y-4">
      <HudPanel title="// NETWORK INTEGRITY OVERVIEW" icon={TrendingUp}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">
          <StatBlock label="Total Submissions" value={total} />
          <StatBlock label="Verified" value={verified} tone="verified" />
          <StatBlock label="Tampered" value={tampered} tone="tampered" />
          <StatBlock label="Pending Review" value={pending} tone="pending" />
          <StatBlock label="Released to Network" value={released} />
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
            <span>NETWORK INTEGRITY RATE</span>
            <span>{integrityRate}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${integrityRate}%` }}
            />
          </div>
        </div>
      </HudPanel>

      <HudPanel title="// PER-ORGANIZATION BREAKDOWN" icon={ShieldCheck}>
        {Object.keys(byOrg).length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            // no submission history yet
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {Object.entries(byOrg).map(([orgId, counts]) => {
              const orgTotal = counts.verified + counts.tampered + counts.pending;
              return (
                <div key={orgId} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-cyan-200">
                      {orgId.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {orgTotal} submission{orgTotal !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded overflow-hidden flex bg-slate-800">
                    {counts.verified > 0 && (
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${(counts.verified / orgTotal) * 100}%` }}
                      />
                    )}
                    {counts.tampered > 0 && (
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(counts.tampered / orgTotal) * 100}%` }}
                      />
                    )}
                    {counts.pending > 0 && (
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(counts.pending / orgTotal) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HudPanel>
    </div>
  );
}
