import { useState } from "react";
import { Activity, ShieldCheck, ShieldAlert, Radar, Loader2 } from "lucide-react";
import { useVerdicts, analyzeCustodySubmission } from "../api";
import { useAuth } from "../auth";
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
  // /custody/verdicts is public and network-wide — every role sees the same
  // verified/tampered/pending picture. The raw evidence-block endpoint
  // (/custody/submissions) is Authority-only and was the previous data
  // source here, which is why this page rendered empty for org logins.
  const { verdicts, loading, refresh } = useVerdicts();
  const { role } = useAuth();
  const isAuthority = role === "authority";
  const [analyzing, setAnalyzing] = useState(null);
  const [error, setError] = useState(null);

  const total = verdicts.length;
  const verified = verdicts.filter((s) => s.verdict === "VERIFIED").length;
  const tampered = verdicts.filter((s) => s.verdict === "TAMPERED").length;
  const pending = verdicts.filter((s) => s.status === "pending").length;
  const released = verdicts.filter((s) => s.released).length;

  const integrityRate = total > 0 ? Math.round((verified / total) * 100) : 0;

  const byOrg = verdicts.reduce((acc, s) => {
    acc[s.org_id] = acc[s.org_id] || { total: 0, verified: 0, tampered: 0, pending: 0 };
    acc[s.org_id].total += 1;
    if (s.verdict === "VERIFIED") acc[s.org_id].verified += 1;
    if (s.verdict === "TAMPERED") acc[s.org_id].tampered += 1;
    if (s.status === "pending") acc[s.org_id].pending += 1;
    return acc;
  }, {});

  async function handleAnalyze(submissionId) {
    setAnalyzing(submissionId);
    setError(null);
    try {
      await analyzeCustodySubmission(submissionId);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(null);
    }
  }

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

      <HudPanel title="// NETWORK INTEGRITY RATE" icon={ShieldCheck}>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
            <span>VERIFIED / TOTAL SUBMISSIONS</span>
            <span className="text-emerald-300">{integrityRate}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${integrityRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 pt-1">
            <span>{released} of {total} submissions released to network</span>
            <span>{total - released} withheld or pending</span>
          </div>
        </div>
      </HudPanel>

      <HudPanel title="// PER-ORG TRUST SIGNAL" icon={Radar}>
        {loading ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">loading…</div>
        ) : Object.keys(byOrg).length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            // no data yet — no submissions received from any org
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {Object.entries(byOrg).map(([org, stats]) => {
              const orgIntegrity =
                stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
              return (
                <div key={org} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-cyan-200">{org.toUpperCase()}</span>
                    <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
                      <span>{stats.total} submitted</span>
                      <span className="text-emerald-400">{stats.verified} verified</span>
                      <span className="text-rose-400">{stats.tampered} tampered</span>
                      {stats.pending > 0 ? (
                        <span className="text-amber-400">{stats.pending} pending</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded overflow-hidden flex bg-slate-800">
                    {stats.verified > 0 && (
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${(stats.verified / stats.total) * 100}%` }}
                      />
                    )}
                    {stats.tampered > 0 && (
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(stats.tampered / stats.total) * 100}%` }}
                      />
                    )}
                    {stats.pending > 0 && (
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HudPanel>

      {isAuthority ? (
        <HudPanel title="// AUTHORITY CONSOLE — PENDING REVIEW" icon={ShieldCheck}>
          {error ? (
            <p className="p-3 font-mono text-[11px] text-rose-400">// {error}</p>
          ) : null}
          {verdicts.filter((s) => s.status === "pending").length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-slate-500">
              // no pending submissions awaiting review
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {verdicts
                .filter((s) => s.status === "pending")
                .map((s) => (
                  <div key={s.submission_id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-mono text-sm text-cyan-200">{s.submission_id}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                        {s.org_id?.toUpperCase()} · submitted {s.submitted_at}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAnalyze(s.submission_id)}
                      disabled={analyzing === s.submission_id}
                      className="cut-corner font-display flex items-center gap-2 bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 disabled:opacity-40"
                    >
                      {analyzing === s.submission_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Analyze
                    </button>
                  </div>
                ))}
            </div>
          )}
        </HudPanel>
      ) : (
        <p className="text-center font-mono text-[10px] text-slate-600">
          // full evidence-block review is restricted to the Authority role — this view shows verdicts only
        </p>
      )}
    </Page>
  );
}