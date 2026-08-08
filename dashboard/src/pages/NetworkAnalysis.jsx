import { Activity, ShieldCheck, ShieldAlert, Radar } from "lucide-react";
import { useCustodySubmissions } from "../api";
import Page from "../components/Page";
import HudPanel from "../components/HudPanel";
import CountUp from "../components/CountUp";
import DecryptedText from "../components/DecryptedText";

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <HudPanel title={label} icon={Icon}>
      <div className="flex flex-col items-center justify-center text-center py-1">
        <div className="font-display glow-text text-3xl font-bold text-white">
          <CountUp value={value} />
        </div>
        <p className="mt-1 min-h-[14px] text-[10px] text-slate-500">{hint ?? ""}</p>
      </div>
    </HudPanel>
  );
}

export default function NetworkAnalysis() {
  const { submissions, loading } = useCustodySubmissions();

  const total = submissions.length;
  const verified = submissions.filter((s) => s.verdict === "VERIFIED").length;
  const tampered = submissions.filter((s) => s.verdict === "TAMPERED").length;
  const pending = submissions.filter((s) => s.status === "pending").length;

  const byOrg = submissions.reduce((acc, s) => {
    acc[s.org_id] = acc[s.org_id] || { total: 0, verified: 0, tampered: 0 };
    acc[s.org_id].total += 1;
    if (s.verdict === "VERIFIED") acc[s.org_id].verified += 1;
    if (s.verdict === "TAMPERED") acc[s.org_id].tampered += 1;
    return acc;
  }, {});

  return (
    <Page className="space-y-4 p-4">
      <div>
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-300">
          <DecryptedText text="// NETWORK ANALYSIS" />
        </h1>
        <p className="font-mono text-[11px] text-slate-500 mt-1">
          aggregate custody-verification trends across all participating organizations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={Radar} label="Total Submissions" value={total} hint="all-time" />
        <Stat icon={ShieldCheck} label="Verified" value={verified} hint="chain-intact" />
        <Stat icon={ShieldAlert} label="Tampered" value={tampered} hint="integrity failed" />
        <Stat icon={Activity} label="Pending" value={pending} hint="awaiting review" />
      </div>

      <HudPanel title="// PER-ORG TRUST SIGNAL" icon={Radar}>
        {loading ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">loading…</div>
        ) : Object.keys(byOrg).length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            // no data yet — no submissions received from any org
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {Object.entries(byOrg).map(([org, stats]) => (
              <div key={org} className="flex items-center justify-between p-4">
                <span className="font-mono text-sm text-cyan-200">{org.toUpperCase()}</span>
                <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
                  <span>{stats.total} submitted</span>
                  <span className="text-emerald-400">{stats.verified} verified</span>
                  <span className="text-rose-400">{stats.tampered} tampered</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </HudPanel>
    </Page>
  );
}