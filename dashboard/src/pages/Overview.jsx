import { ORGS, useIncidents } from "../api";

const NODE_POS = { org_a: [160, 110], org_b: [640, 110], org_c: [400, 350] };
const CENTER = [400, 215];

export default function Overview() {
  const incidents = useIncidents();
  const countFor = (id) => incidents.filter((i) => i.source_org === id).length;

  return (
    <main className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Active Campaigns" value="—" hint="Unlocks with Master AI correlation (Phase 3)" />
        <Stat label="Organizations Protected" value={ORGS.length} />
        <Stat label="Incidents Recorded" value={incidents.length} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-[#0d1117] p-4">
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
              <stop offset="100%" stopColor="#0a0e14" />
            </radialGradient>
            <radialGradient id="coreRed">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#0a0e14" />
            </radialGradient>
            <radialGradient id="coreGreen">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#0a0e14" />
            </radialGradient>
            <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1.2" cy="1.2" r="1.2" fill="#1c2534" />
            </pattern>
          </defs>

          <rect width="800" height="470" fill="url(#dots)" />

          {ORGS.map((o, idx) => {
            const [x, y] = NODE_POS[o.id];
            const path = `M${x},${y} L${CENTER[0]},${CENTER[1]}`;
            return (
              <g key={o.id}>
                <path d={path} fill="none" stroke="#164e63" strokeWidth="5" opacity="0.15" />
                <path d={path} fill="none" stroke="#22d3ee" strokeWidth="1.4" strokeDasharray="3 8" opacity="0.5" className="flow-line" />
                <circle r="3.2" fill="#22d3ee" filter="url(#glow)">
                  <animateMotion dur="3.4s" begin={`${idx * 1.15}s`} repeatCount="indefinite" path={path} />
                </circle>
              </g>
            );
          })}

          <Ripples cx={CENTER[0]} cy={CENTER[1]} r={42} color="#22d3ee" />
          <g className="breathe">
            <circle cx={CENTER[0]} cy={CENTER[1]} r="42" fill="url(#coreCyan)" stroke="#22d3ee" strokeWidth="2" filter="url(#glow)" />
          </g>
          <text x={CENTER[0]} y={CENTER[1] - 3} textAnchor="middle" fill="#22d3ee" fontSize="12" fontWeight="bold">MASTER AI</text>
          <text x={CENTER[0]} y={CENTER[1] + 13} textAnchor="middle" fill="#475569" fontSize="9">SYS.CORE.01</text>

          {ORGS.map((o, idx) => {
            const [x, y] = NODE_POS[o.id];
            const n = countFor(o.id);
            const hot = n > 0;
            const color = hot ? "#f87171" : "#34d399";
            return (
              <g key={o.id}>
                <Ripples cx={x} cy={y} r={30} color={color} delay={idx * 0.9} />
                <g className="breathe" style={{ animationDelay: `${idx * 0.6}s` }}>
                  <circle cx={x} cy={y} r="30" fill={hot ? "url(#coreRed)" : "url(#coreGreen)"} stroke={color} strokeWidth="2" filter="url(#glow)" />
                </g>
                <text x={x} y={y + 4} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">{o.name}</text>
                <text x={x} y={y + 56} textAnchor="middle" fill={color} fontSize="9" letterSpacing="1">
                  {hot ? `\u25CF ${n} INCIDENT${n > 1 ? "S" : ""} LOGGED` : "\u25CF SECURE"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </main>
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

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0d1117] p-4 transition-colors hover:border-cyan-500/40">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-slate-600">{hint}</p> : null}
    </div>
  );
}
