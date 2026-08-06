import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Hexagon } from "lucide-react";
import GlitchText from "./components/GlitchText";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/incidents", label: "Live Incidents" },
  { to: "/campaigns", label: "Threat Campaigns" },
  { to: "/evidence", label: "Evidence Vault" },
  { to: "/audit", label: "Audit Portal" },
];

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
      setHex("0x" + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0"));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-4 font-mono text-[10px] text-slate-500">
      <span>{now.toISOString().slice(11, 19)} UTC</span>
      <span className="text-cyan-500/80">{hex}</span>
      <span className="hidden md:inline">30.9010N 75.8573E</span>
      <span className="flex items-center gap-2 text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        ONLINE
      </span>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#05070c] font-sans text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="scanlines absolute inset-0" />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size, animationDelay: p.delay }}
          />
        ))}
      </div>

      <div className="relative">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800/80 bg-[#05070c]/70 px-6 py-3 backdrop-blur-md">
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2">
              <Hexagon className="h-5 w-5 animate-pulse text-cyan-400" strokeWidth={1.6} />
              <GlitchText text="GHOSTCHAIN" className="font-display text-lg font-bold tracking-[0.25em] text-white" />
            </span>
            <nav className="font-display flex gap-5 text-[11px] uppercase tracking-widest">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    isActive
                      ? "border-b-2 border-cyan-400 pb-1 text-cyan-400"
                      : "text-slate-500 transition-colors hover:text-cyan-300"
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <HudTicker />
        </header>
        <Outlet />
      </div>
    </div>
  );
}