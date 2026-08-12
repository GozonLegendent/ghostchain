import { useMemo } from "react";
import { Radar, Shield, Activity } from "lucide-react";
import { ORGS, useAllReports } from "../api";
import Page from "../components/Page";
import CountUp from "../components/CountUp";
import TiltCard from "../components/TiltCard";
import HudPanel from "../components/HudPanel";
import DecryptedText from "../components/DecryptedText";
import NetworkScene3D from "../components/NetworkScene3D";
import ErrorBoundary from "../components/ErrorBoundary";

export default function Overview() {
  // Node status comes from sanitized network-wide reports (/reports/all on
  // master-ai), not raw per-org /incidents — every role sees an accurate,
  // consistent map regardless of who is logged in.
  const { reports } = useAllReports();

  const countByOrg = useMemo(() => {
    const map = {};
    for (const o of ORGS) map[o.id] = 0;
    for (const r of reports) {
      if (map[r.source_org] !== undefined) map[r.source_org] += 1;
    }
    return map;
  }, [reports]);

  // Stable node array: only creates a new reference when the underlying
  // counts actually change, not on every 5s poll tick. Prevents the 3D
  // scene's memoized geometry/curves from being needlessly rebuilt.
  const nodesKey = ORGS.map((o) => `${o.id}:${countByOrg[o.id]}`).join("|");
  const nodes = useMemo(
    () =>
      ORGS.map((o) => {
        const count = countByOrg[o.id] ?? 0;
        return { id: o.id, name: o.name, count, hot: count > 0 };
      }),
    [nodesKey]
  );

  return (
    <Page className="space-y-4 p-4">
      <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-300">
        <DecryptedText text="// NETWORK OVERVIEW" />
      </h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat icon={Radar} label="Active Campaigns" value="—" hint="Unlocks with Master AI correlation (Phase 3)" />
        <Stat icon={Shield} label="Organizations Protected" value={ORGS.length} />
        <Stat icon={Activity} label="Sanitized Reports Recorded" value={reports.length} />
      </div>

      <HudPanel
        title="ctOS // Network Map"
        icon={Radar}
        right={<span className="cut-corner bg-red-500/15 px-2 py-0.5 font-mono text-[10px] text-red-400">LIVE</span>}
      >
        <ErrorBoundary
          fallback={
            <div className="flex h-[520px] w-full items-center justify-center border border-slate-800 bg-slate-950/60">
              <p className="font-mono text-xs text-slate-500">
                // 3D network view unavailable — WebGL render failed
              </p>
            </div>
          }
        >
          <NetworkScene3D nodes={nodes} />
        </ErrorBoundary>
      </HudPanel>
    </Page>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <TiltCard>
      <HudPanel className="h-full">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
            <Icon className="h-4 w-4 text-cyan-400" strokeWidth={1.6} />
          </div>
          <p className="font-display glow-text mt-1 text-3xl font-bold text-white">
            {typeof value === "number" ? <CountUp value={value} /> : value}
          </p>
          <p className="mt-1 min-h-[14px] text-[10px] text-slate-500">{hint ?? ""}</p>
        </div>
      </HudPanel>
    </TiltCard>
  );
}