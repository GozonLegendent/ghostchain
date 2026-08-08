import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ScanLine,
  Clock,
  Search,
} from "lucide-react";
import { useAuth, ROLES } from "../auth";
import {
  useCustodySubmissions,
  analyzeCustodySubmission,
  useVerdicts,
} from "../api";
import Page from "../components/Page";
import HudPanel from "../components/HudPanel";
import DecryptedText from "../components/DecryptedText";

function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function VerdictBadge({ verdict, status }) {
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 border border-amber-400/40 text-amber-300 rounded">
        <Clock className="w-3 h-3" /> PENDING REVIEW
      </span>
    );
  }
  if (verdict === "VERIFIED") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 border border-emerald-400/40 text-emerald-300 rounded">
        <ShieldCheck className="w-3 h-3" /> VERIFIED
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 border border-rose-500/40 text-rose-300 rounded">
      <ShieldAlert className="w-3 h-3" /> TAMPERED
    </span>
  );
}

function AuthorityView() {
  const { submissions, loading, refresh } = useCustodySubmissions();
  const [analyzing, setAnalyzing] = useState(null);

  async function onAnalyze(submissionId) {
    setAnalyzing(submissionId);
    try {
      await analyzeCustodySubmission(submissionId);
      await refresh();
    } finally {
      setAnalyzing(null);
    }
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const analyzed = submissions.filter((s) => s.status === "analyzed");

  return (
    <div className="space-y-4">
      <HudPanel title="// PENDING CUSTODY SUBMISSIONS" icon={ScanLine}>
        {loading ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            querying submissions…
          </div>
        ) : pending.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            // no submissions awaiting review
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {pending.map((s) => (
              <div key={s.submission_id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-mono text-sm text-cyan-200">
                    {s.org_id.toUpperCase()}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    {s.blocks.length} block{s.blocks.length > 1 ? "s" : ""} · submitted {fmtTime(s.submitted_at)}
                  </div>
                </div>
                <button
                  onClick={() => onAnalyze(s.submission_id)}
                  disabled={analyzing === s.submission_id}
                  className="cut-corner font-display flex items-center gap-2 bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {analyzing === s.submission_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ScanLine className="w-3.5 h-3.5" />
                  )}
                  Analyze
                </button>
              </div>
            ))}
          </div>
        )}
      </HudPanel>

      <HudPanel title="// ISSUED VERDICTS" icon={ShieldCheck}>
        {analyzed.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            // no verdicts issued yet
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {analyzed.map((s) => (
              <div key={s.submission_id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-mono text-sm text-cyan-200">{s.org_id.toUpperCase()}</div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    analyzed {fmtTime(s.analyzed_at)}
                  </div>
                </div>
                <VerdictBadge verdict={s.verdict} status={s.status} />
              </div>
            ))}
          </div>
        )}
      </HudPanel>
    </div>
  );
}

function OrgLookupView() {
  const { verdicts, loading } = useVerdicts();
  const [query, setQuery] = useState("");

  const orgIds = [...new Set(verdicts.map((v) => v.org_id))];
  const filtered = query
    ? verdicts.filter((v) => v.org_id.toLowerCase().includes(query.toLowerCase()))
    : verdicts;

  return (
    <div className="space-y-4">
      <HudPanel title="// LOOKUP ORGANIZATION AUDIT HISTORY" icon={Search}>
        <div className="p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search org id…"
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-500"
          />
          {orgIds.length > 0 && (
            <p className="font-mono text-[10px] text-slate-500 mt-2">
              known orgs: {orgIds.map((o) => o.toUpperCase()).join(", ")}
            </p>
          )}
        </div>
      </HudPanel>

      <HudPanel title="// RESULTS" icon={ShieldCheck}>
        {loading ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">// no matching records</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((v) => (
              <div key={v.submission_id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-mono text-sm text-cyan-200">{v.org_id.toUpperCase()}</div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">{fmtTime(v.analyzed_at || v.submitted_at)}</div>
                </div>
                <VerdictBadge verdict={v.verdict} status={v.status} />
              </div>
            ))}
          </div>
        )}
      </HudPanel>
    </div>
  );
}

export default function AuditPortal() {
  const { role } = useAuth();
  const isAuthority = role === ROLES.AUTHORITY;

  return (
    <Page className="space-y-4 p-4">
      <div>
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-300">
          <DecryptedText text={isAuthority ? "// VERDICT LEDGER" : "// AUDIT PORTAL"} />
        </h1>
        <p className="font-mono text-[11px] text-slate-500 mt-1">
          {isAuthority
            ? "review submitted evidence, issue verdicts — evidence never leaves this view"
            : "look up any organization's audit and verdict history"}
        </p>
      </div>

      {isAuthority ? <AuthorityView /> : <OrgLookupView />}
    </Page>
  );
}