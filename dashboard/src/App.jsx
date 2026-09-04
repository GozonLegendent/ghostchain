import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Hexagon, LogOut } from "lucide-react";
import GlitchText from "./components/GlitchText";
import { useAuth, ROLE_LABELS, ROLES } from "./auth";

function getNav(role) {
  const isAuthority = role === ROLES.AUTHORITY;
  const items = [{ to: "/", label: "Overview" }];
  if (!isAuthority) items.push({ to: "/incidents", label: "Live Incidents" });
  items.push({ to: "/campaigns", label: "Threat Campaigns" });
  items.push({ to: "/reports", label: "Sanitized Reports" });
  items.push({ to: "/evidence", label: "Evidence Vault" });
  items.push({ to: "/audit", label: isAuthority ? "Verdict Ledger" : "Audit Portal" });
  if (isAuthority) items.push({ to: "/analysis", label: "Network Analysis" });
  return items;
}

const PARTICLES = [
  { top: "18%", left: "6%", size: 3, delay: "0s" },
  { top: "70%", left: "12%", size: 2, delay: "1.2s" },
  { top: "30%", left: "88%", size: 3, delay: "2.1s" },
  { top: "80%", left: "78%", size: 2, delay: "0.6s" },
  { top: "12%", left: "55%", size: 2, delay: "1.8s" },
  { top: "55%", left: "40%", size: 2, delay: "2.6s" },
  { top: "88%", left: "50%", size: 3, delay: "0.9s" },
];

function HudTicker() {
  const [now, setNow] = useState(new Date());
  const [hex, setHex] = useState("0x3F2A");

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setHex(
        "0x" +
          Math.floor(Math.random() * 0xffff)
            .toString(16)
            .toUpperCase()
            .padStart(4, "0")
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-4 font-mono text-[11px] text-cyan-400/70">
      <span>{now.toISOString().slice(11, 19)} UTC</span>
      <span className="hidden xl:inline text-cyan-500/50">{hex}</span>
      <span className="hidden xl:inline">30.9010N 75.8573E</span>
      <span className="flex items-center gap-1.5 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        ONLINE
      </span>
    </div>
  );
}

function IdentityBadge() {
  const { role, logout } = useAuth();
  if (!role) return null;

  return (
    <div className="flex items-center gap-3 font-mono text-xs">
      <span className="hidden sm:inline px-2 py-1 border border-cyan-500/30 rounded text-cyan-300/90 whitespace-nowrap">
        {ROLE_LABELS[role]}
      </span>
      <button
        onClick={logout}
        className="flex items-center gap-1 text-slate-500 hover:text-rose-300 transition-colors shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Exit</span>
      </button>
    </div>
  );
}

export default function App() {
  const { role } = useAuth();
  const NAV = getNav(role);

  return (
    <div className="relative min-h-screen bg-[#05070c] text-slate-200 overflow-x-hidden">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="scanlines fixed inset-0 pointer-events-none z-0" />

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}

      <header className="relative z-10 border-b border-cyan-500/20 bg-[#05070c]/80 backdrop-blur-sm">
        <div className="flex items-center px-6 py-3 gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <Hexagon className="w-6 h-6 text-cyan-400" strokeWidth={1.6} />
            <span className="font-display text-lg text-cyan-100 tracking-wide whitespace-nowrap">
              <GlitchText text="GHOSTCHAIN" />
            </span>
          </div>

          <nav className="flex items-center gap-4 md:gap-6 font-mono text-xs uppercase tracking-wider overflow-x-auto whitespace-nowrap flex-1 min-w-0 py-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `shrink-0 pb-1 border-b-2 transition-colors ${
                    isActive
                      ? "border-cyan-400 text-cyan-300"
                      : "border-transparent text-slate-500 hover:text-cyan-300/80"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <HudTicker />
            <IdentityBadge />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}