import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Radar,
  Sparkles,
  Network,
  Shield,
  Loader2,
  RefreshCw,
  ChevronDown,
  Fingerprint,
} from "lucide-react";
import { useCampaigns, generateBrief } from "../api";
import Page from "../components/Page";
import HudPanel from "../components/HudPanel";
import DecryptedText from "../components/DecryptedText";
import CountUp from "../components/CountUp";

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CampaignAccordionRow({ campaign, defaultOpen, onBriefGenerated }) {
  const [open, setOpen] = useState(defaultOpen);
  const [briefing, setBriefing] = useState(false);
  const [briefError, setBriefError] = useState(null);

  async function onGenerateBrief(e) {
    e.stopPropagation();
    setBriefing(true);
    setBriefError(null);
    try {
      await generateBrief(campaign.campaign_id);
      await onBriefGenerated();
    } catch (err) {
      setBriefError(err.message);
    } finally {
      setBriefing(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-4 cut-corner border px-5 py-4 transition-colors spotlight-card ${
          open
            ? "border-cyan-400/60 bg-cyan-500/10"
            : "border-slate-800 bg-slate-900/40 hover:border-cyan-500/30"
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <ChevronDown
            className={`w-4 h-4 text-cyan-300 shrink-0 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
          <span className="font-display text-cyan-200 text-lg tracking-wide shrink-0">
            {campaign.threat_actor}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-500 shrink-0">
            <Fingerprint className="w-3.5 h-3.5" />
            {campaign.fingerprint.source_ip}
          </span>
          <div className="hidden md:flex flex-wrap gap-1.5">
            {campaign.orgs_affected.map((o) => (
              <span
                key={o}
                className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800/80 text-cyan-300/80 rounded"
              >
                {o}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {campaign.orgs_affected.length > 1 ? (
            <span className="text-[10px] font-mono px-2 py-0.5 border border-amber-400/40 text-amber-300 rounded">
              {campaign.orgs_affected.length} ORGS LINKED
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 border border-slate-600 text-slate-400 rounded">
              ISOLATED
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-500">
            {campaign.report_count} report{campaign.report_count > 1 ? "s" : ""}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="dossier"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-x border-b border-cyan-400/30 bg-slate-950/60 p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono mb-4">
                <div className="border border-slate-800 p-2 cut-corner">
                  <div className="text-slate-500">SOURCE IP FINGERPRINT</div>
                  <div className="text-cyan-200 mt-0.5">{campaign.fingerprint.source_ip}</div>
                </div>
                <div className="border border-slate-800 p-2 cut-corner">
                  <div className="text-slate-500">MITRE TECHNIQUES</div>
                  <div className="text-cyan-200 mt-0.5">{campaign.techniques.join(", ")}</div>
                </div>
                <div className="border border-slate-800 p-2 cut-corner">
                  <div className="text-slate-500">ORGS AFFECTED</div>
                  <div className="text-cyan-200 mt-0.5">{campaign.orgs_affected.join(", ")}</div>
                </div>
                <div className="border border-slate-800 p-2 cut-corner">
                  <div className="text-slate-500">ATTACK TYPES</div>
                  <div className="text-cyan-200 mt-0.5">{campaign.attack_types.join(", ")}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-mono text-slate-500 mb-2">◆ CROSS-ORG TIMELINE</div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {campaign.reports.map((r, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-cyan-500/40 pl-3 py-1.5 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-cyan-300">{fmtTime(r.timestamp)}</span>
                        <span className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded text-[10px]">
                          {r.source_org}
                        </span>
                        <span className="text-slate-500">
                          {r.attack_type} ({r.mitre_technique})
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1">{r.observed_behaviour}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-500">◆ GLOBAL INTEL BRIEF</span>
                  <button
                    onClick={onGenerateBrief}
                    disabled={briefing}
                    className="flex items-center gap-2 text-xs font-mono text-cyan-300 border border-cyan-500/40 hatch cut-corner px-3 py-1.5 hover:bg-cyan-500/10 transition disabled:opacity-50"
                  >
                    {briefing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {briefing ? "GENERATING…" : "GENERATE INTEL BRIEF"}
                  </button>
                </div>
                {briefError && (
                  <div className="text-rose-400 text-xs font-mono mb-2">// {briefError}</div>
                )}
                {campaign.intel_brief ? (
                  <div className="text-sm text-slate-300 leading-relaxed border border-cyan-500/20 bg-cyan-500/5 p-3 cut-corner">
                    <DecryptedText text={campaign.intel_brief} speed={8} />
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs font-mono">
                    // no brief generated yet for this campaign
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <HudPanel title={label} icon={Icon}>
      <div className="flex flex-col items-center justify-center text-center py-1">
        <div className="font-display glow-text text-3xl font-bold text-white">
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </div>
        <p className="mt-1 min-h-[14px] text-[10px] text-slate-500">{hint ?? ""}</p>
      </div>
    </HudPanel>
  );
}

export default function ThreatCampaigns() {
  const { campaigns, loading, error, refresh } = useCampaigns();

  const multiOrg = campaigns.filter((c) => c.orgs_affected.length > 1).length;
  const totalReports = campaigns.reduce((s, c) => s + c.report_count, 0);

  return (
    <Page className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-300">
          <DecryptedText text="// THREAT CAMPAIGNS" />
        </h1>
        <button
          onClick={refresh}
          className="cut-corner font-display flex items-center gap-2 bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Re-Correlate
        </button>
      </div>

      <p className="font-mono text-[11px] text-slate-500 -mt-2">
        correlated by attacker infrastructure fingerprint · not attack type · order-independent
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat icon={Radar} label="Campaigns" value={campaigns.length} hint="distinct threat clusters" />
        <Stat icon={Network} label="Cross-Org" value={multiOrg} hint="campaigns hitting 2+ orgs" />
        <Stat icon={Shield} label="Sanitized Reports" value={totalReports} hint="zero raw logs shared" />
      </div>

      {error && (
        <div className="border border-rose-500/40 bg-rose-500/5 text-rose-300 text-sm font-mono p-3 cut-corner">
          // master-ai unreachable: {error}
        </div>
      )}

      {campaigns.length === 0 && !loading && (
        <div className="text-slate-500 font-mono text-sm p-4 border border-slate-800 cut-corner">
          // no correlated campaigns yet — awaiting sanitized reports
        </div>
      )}

      {campaigns.map((c, i) => (
        <CampaignAccordionRow
          key={c.campaign_id}
          campaign={c}
          defaultOpen={i === 0}
          onBriefGenerated={refresh}
        />
      ))}
    </Page>
  );
}