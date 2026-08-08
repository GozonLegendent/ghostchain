import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link2, ShieldCheck, ShieldAlert, RefreshCw, Database, Send, Clock } from "lucide-react";
import { verifyAll, submitCustody, useVerdicts } from "../api";
import { useAuth } from "../auth";
import Page from "../components/Page";
import HudPanel from "../components/HudPanel";
import DecryptedText from "../components/DecryptedText";
import GlitchText from "../components/GlitchText";

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

export default function EvidenceVault() {
  const { role } = useAuth();
  const [reports, setReports] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [sel, setSel] = useState(null);

  const { verdicts, loading: verdictsLoading, refresh: refreshVerdicts } = useVerdicts();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);

  const runVerify = useCallback(async () => {
    setScanning(true);
    const res = await verifyAll();
    setReports(res);
    setTimeout(() => setScanning(false), 500);
  }, []);

  useEffect(() => {
    runVerify();
  }, [runVerify]);

  const allValid = reports?.length > 0 && reports.every((r) => r.data?.chain_valid);
  const anyTampered = reports?.some((r) => r.data && !r.data.chain_valid);
  const selBlock =
    sel && reports
      ? reports.find((r) => r.org.id === sel.orgId)?.data?.blocks?.[sel.idx]
      : null;

  async function onSubmitCustody() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const mine = reports?.find((r) => r.org.id === role);
      if (!mine?.data?.blocks?.length) {
        throw new Error("no evidence blocks found for this org");
      }
      const res = await submitCustody(role, mine.data.blocks);
      setLastSubmission(res);
      await refreshVerdicts();
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-300">
          <DecryptedText text="// EVIDENCE VAULT" />
        </h1>
        <button
          onClick={runVerify}
          className="cut-corner font-display flex items-center gap-2 bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
          Re-Verify Chains
        </button>
      </div>

      <HudPanel>
        <div className="flex items-center gap-4 p-4">
          {anyTampered ? (
            <>
              <ShieldAlert className="h-8 w-8 text-red-500" strokeWidth={1.6} />
              <div>
                <GlitchText text="TAMPER DETECTED" className="font-display text-xl font-bold tracking-widest text-red-400" />
                <p className="font-mono text-[11px] text-slate-400">
                  one or more evidence chains failed cryptographic verification
                </p>
              </div>
            </>
          ) : allValid ? (
            <>
              <ShieldCheck className="h-8 w-8 text-emerald-400" strokeWidth={1.6} />
              <div>
                <p className="font-display glow-text text-xl font-bold tracking-widest text-emerald-400">
                  ALL EVIDENCE CHAINS VERIFIED
                </p>
                <p className="font-mono text-[11px] text-slate-400">
                  SHA-256 · every block content-intact and link-intact · audit-ready
                </p>
              </div>
            </>
          ) : (
            <p className="font-mono text-xs text-slate-500">// contacting org nodes…</p>
          )}
        </div>
      </HudPanel>

      {(reports ?? []).map(({ org, data }) => (
        <HudPanel
          key={org.id}
          title={`${org.name} // Evidence Chain`}
          icon={Database}
          right={
            data ? (
              <span
                className={`cut-corner px-2 py-0.5 font-mono text-[10px] ${
                  data.chain_valid ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}
              >
                {data.chain_valid ? "INTACT" : "COMPROMISED"}
              </span>
            ) : (
              <span className="cut-corner bg-slate-700/30 px-2 py-0.5 font-mono text-[10px] text-slate-500">OFFLINE</span>
            )
          }
        >
          <div className="flex items-center gap-1 overflow-x-auto p-4">
            {!data ? (
              <p className="font-mono text-xs text-slate-600">// node unreachable</p>
            ) : data.blocks.length === 0 ? (
              <p className="font-mono text-xs text-slate-600">// no evidence blocks yet</p>
            ) : (
              data.blocks.map((b, i) => (
                <div key={i} className="flex shrink-0 items-center gap-1">
                  {i > 0 ? (
                    <Link2
                      className={`h-3.5 w-3.5 shrink-0 ${b.link_intact ? "text-cyan-500/70" : "text-red-500"}`}
                      strokeWidth={1.8}
                    />
                  ) : null}
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSel({ orgId: org.id, idx: i })}
                    className={`cut-corner border p-2 text-left transition-transform hover:-translate-y-0.5 ${
                      b.status === "VALID"
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-red-500/60 bg-red-500/10"
                    } ${sel?.orgId === org.id && sel?.idx === i ? "ring-1 ring-cyan-400" : ""}`}
                  >
                    <p className={`font-mono text-[9px] ${b.status === "VALID" ? "text-emerald-400" : "text-red-400"}`}>
                      BLOCK #{String(b.block_index).padStart(3, "0")} · {b.status}
                    </p>
                    <p className="font-mono text-[10px] text-slate-300">{b.block_hash.slice(0, 14)}…</p>
                    <p className="font-mono text-[9px] text-slate-500">{b.attack_type}</p>
                  </motion.button>
                </div>
              ))
            )}
          </div>
        </HudPanel>
      ))}

      {selBlock ? (
        <HudPanel title={`Block #${String(selBlock.block_index).padStart(3, "0")} // Detail`} icon={Link2}>
          <div className="grid grid-cols-1 gap-3 p-4 font-mono text-[11px] md:grid-cols-2">
            <Field label="Block Hash" value={selBlock.block_hash} accent />
            <Field label="Previous Hash" value={selBlock.prev_hash} />
            <Field label="Timestamp" value={selBlock.timestamp} />
            <Field label="Attack Type" value={selBlock.attack_type} />
            <Field
              label="Content Check"
              value={selBlock.content_intact ? "✓ HASH MATCHES CONTENT" : "✗ CONTENT MODIFIED AFTER SEALING"}
              ok={selBlock.content_intact}
            />
            <Field
              label="Chain Link Check"
              value={selBlock.link_intact ? "✓ LINKED TO PREVIOUS BLOCK" : "✗ CHAIN LINK BROKEN"}
              ok={selBlock.link_intact}
            />
          </div>
        </HudPanel>
      ) : null}

      <HudPanel title="// SUBMIT TO AUTHORITY FOR VERIFICATION" icon={Send}>
        <div className="p-4">
          <p className="font-mono text-xs text-slate-500 mb-4 leading-relaxed">
            Submit your hash-chain to GhostChain Authority for independent verification. Authority
            sees the evidence chain to verify it — the network only ever sees the resulting verdict,
            never the underlying blocks.
          </p>
          <button
            onClick={onSubmitCustody}
            disabled={submitting}
            className="cut-corner font-display flex items-center gap-2 bg-cyan-500 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Submit for Verification
          </button>
          {submitError && (
            <p className="font-mono text-xs text-rose-400 mt-3">// {submitError}</p>
          )}
          {lastSubmission && (
            <p className="font-mono text-xs text-emerald-400 mt-3">
              // submitted — awaiting Authority review ({lastSubmission.submission_id})
            </p>
          )}
        </div>
      </HudPanel>

      <HudPanel title="// NETWORK VERDICT LEDGER" icon={ShieldCheck}>
        {verdictsLoading ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">loading…</div>
        ) : verdicts.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-500">
            // no verdicts issued across the network yet
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {verdicts.map((v) => (
              <div key={v.submission_id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-mono text-sm text-cyan-200">{v.org_id.toUpperCase()}</div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    {v.status === "pending" ? "submitted" : "analyzed"} {fmtTime(v.analyzed_at || v.submitted_at)}
                  </div>
                </div>
                <VerdictBadge verdict={v.verdict} status={v.status} />
              </div>
            ))}
          </div>
        )}
      </HudPanel>
    </Page>
  );
}

function Field({ label, value, accent, ok }) {
  const color = ok === undefined ? (accent ? "text-cyan-300" : "text-slate-300") : ok ? "text-emerald-400" : "text-red-400";
  return (
    <div className="border border-slate-800 bg-[#05070c] p-3">
      <p className="text-[9px] uppercase text-slate-500">{label}</p>
      <p className={`mt-1 break-all ${color}`}>{value}</p>
    </div>
  );
}