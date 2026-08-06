import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/incidents", label: "Live Incidents" },
  { to: "/campaigns", label: "Threat Campaigns" },
  { to: "/evidence", label: "Evidence Vault" },
  { to: "/audit", label: "Audit Portal" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0e14] text-slate-200 font-sans">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="font-bold tracking-widest text-white">⬡ GHOSTCHAIN</span>
          <nav className="flex gap-5 text-xs">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "text-cyan-400 border-b-2 border-cyan-400 pb-1"
                    : "text-slate-500 hover:text-slate-300"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <span className="text-xs text-emerald-400">● NETWORK ONLINE</span>
      </header>
      <Outlet />
    </div>
  );
}