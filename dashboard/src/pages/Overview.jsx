import { Radar, Shield, Activity } from "lucide-react";
import { ORGS, useIncidents } from "../api";
import Page from "../components/Page";
import CountUp from "../components/CountUp";
import TiltCard from "../components/TiltCard";
import HudPanel from "../components/HudPanel";
import DecryptedText from "../components/DecryptedText";
import Map3D from "../components/Map3D";

const NODE_POS = { org_a: [160, 110], org_b: [640, 110], org_c: [400, 350] };
const CENTER = [400, 215];

export default function Overview() {
  const incidents = useIncidents();
  const countFor = (id) => incidents.filter((i) => i.source_org === id).length;

  return (
    <Page className="space-y-4 p-4">
      <h1 className="font-display text-sm uppercase tracking-[0.3em] text-slate-300">
        <DecryptedText text="// NETWORK OVERVIEW" />
      </h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat icon={Radar} label="Active Campaigns" value="—" hint="Unlocks with Master AI correlation (Phase 3)" />
        <Stat icon={Shield} label="Organizations Protected" value={ORGS.length} />
        <Stat icon={Activity} label="Incidents Recorded" value={incidents.length} />
      </div>

      <HudPanel
        title="ctOS // Network Map"
        icon={Radar}
        right={<span className="cut-corner bg-red-500/15 px-2 py-0.5 font-mono text-[10px] text-red-400">LIVE</span>}
      >
        <Map3D>
          <div className="p-4">
            <svg viewBox="0 0 800 470" className="w-full">
              <defs>
                <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="coreCyan">
                  <stop offset="0%" stopColor="#155e75" />
                  <stop offset="100%" stopColor="#05070c" />
                </radialGradient>
                <radialGradient id="coreRed">
                  <stop offset="0%" stopColor="#7f1d1d" />
                  <stop offset="100%" stopColor="#05070c" />
                </radialGradient>
                <radialGradient id="coreGreen">
                  <stop offset="0%" stopColor="#064e3b" />
                  <stop offset="100%" stopColor="#05070c" />
                </radialGradient>
                <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
                  <circle cx="1.2" cy="1.2" r="1.2" fill="#26344d" />
                </pattern>
              </defs>

              <rect width="800" height="470" fill="url(#dots)" />

              {ORGS.map((o, idx) => {
                const [x, y] = NODE_POS[o.id];
                const path = `M${x},${y} L${CENTER[0]},${CENTER[1]}`;
                return (
                  <g key={o.id}>
                    <path d={path} fill="none" stroke="#164e63" strokeWidth="5" opacity="0.18" />
                    <path d={path} fill="none" stroke="#38e0f8" strokeWidth="1.5" strokeDasharray="3 8" opacity="0.65" className="flow-line" />
                    <circle r="3.4" fill="#38e0f8" filter="url(#glow)">
                      <animateMotion dur="3.4s" begin={`${idx * 1.15}s`} repeatCount="indefinite" path={path} />
                    </circle>
                  </g>
                );
              })}

              <circle cx={CENTER[0]} cy={CENTER[1]} r="60" fill="none" stroke="#22d3ee" strokeWidth="0.9" strokeDasharray="1 9" opacity="0.6">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER[0]} ${CENTER[1]}`} to={`360 ${CENTER[0]} ${CENTER[1]}`} dur="22s" repeatCount="indefinite" />
              </circle>
              <circle cx={CENTER[0]} cy={CENTER[1]} r="74" fill="none" stroke="#818cf8" strokeWidth="0.9" strokeDasharray="1 12" opacity="0.45">
                <animateTransform attributeName="transform" type="rotate" from={`360 ${CENTER[0]} ${CENTER[1]}`} to={`0 ${CENTER[0]} ${CENTER[1]}`} dur="30s" repeatCount="indefinite" />
              </circle>
              <g>
                <circle cx={CENTER[0] + 60} cy={CENTER[1]} r="2.5" fill="#a5f3fc" filter="url(#glow)" />
                <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER[0]} ${CENTER[1]}`} to={`360 ${CENTER[0]} ${CENTER[1]}`} dur="9s" repeatCount="indefinite" />
              </g>

              <Ripples cx={CENTER[0]} cy={CENTER[1]} r={42} color="#22d3ee" />
              <g className="breathe">
                <circle cx={CENTER[0]} cy={CENTER[1]} r="42" fill="url(#coreCyan)" stroke="#38e0f8" strokeWidth="2.2" filter="url(#glow)" />
              </g>
              <text x={CENTER[0]} y={CENTER[1] - 3} textAnchor="middle" fill="#67e8f9" fontSize="12" fontWeight="bold">MASTER AI</text>
              <text x={CENTER[0]} y={CENTER[1] + 13} textAnchor="middle" fill="#64748b" fontSize="9">SYS.CORE.01</text>

              {ORGS.map((o, idx) => {
                const [x, y] = NODE_POS[o.id];
                const n = countFor(o.id);
                const hot = n > 0;
                const color = hot ? "#fb7185" : "#34d399";
                return (
                  <g key={o.id} className="floaty" style={{ animationDelay: `${idx * 1.3}s` }}>
                    <Ripples cx={x} cy={y} r={30} color={color} delay={idx * 0.9} />
                    <g className="breathe" style={{ animationDelay: `${idx * 0.6}s` }}>
                      <circle cx={x} cy={y} r="30" fill={hot ? "url(#coreRed)" : "url(#coreGreen)"} stroke={color} strokeWidth="2.2" filter="url(#glow)" />
                    </g>
                    <text x={x} y={y + 4} textAnchor="middle" fill="#f1f5f9" fontSize="12" fontWeight="600">{o.name}</text>
                    <text x={x} y={y + 56} textAnchor="middle" fill={color} fontSize="9" fontFamily="JetBrains Mono" letterSpacing="1">
                      {hot ? `[ ${n} INCIDENT${n > 1 ? "S" : ""} LOGGED ]` : "[ SECURE ]"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Map3D>
      </HudPanel>
    </Page>
  );
}

function Ripples({ cx, cy, r, color, delay = 0 }) {
  return (
    <>
      {[0, 1].map((k) => (
        <circle key={k} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="2 7" opacity="0">
          <animate attributeName="r" values={`${r};${r + 46}`} dur="3.2s" begin={`${delay + k * 1.6}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0" dur="3.2s" begin={`${delay + k * 1.6}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </>
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