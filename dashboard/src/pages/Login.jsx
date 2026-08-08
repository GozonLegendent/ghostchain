import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hexagon, ShieldCheck, Building2 } from "lucide-react";
import { useAuth, ROLES, ROLE_LABELS } from "../auth";
import GlitchText from "../components/GlitchText";

const OPTIONS = [
  { role: ROLES.AUTHORITY, icon: ShieldCheck, desc: "Correlation engine, verdict ledger, sanitized global view" },
  { role: ROLES.ORG_A, icon: Building2, desc: "Raw incidents, evidence vault, own submissions" },
  { role: ROLES.ORG_B, icon: Building2, desc: "Raw incidents, evidence vault, own submissions" },
  { role: ROLES.ORG_C, icon: Building2, desc: "Raw incidents, evidence vault, own submissions" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  function handleEnter() {
    if (!selected) return;
    login(selected);
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070c] p-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Hexagon className="w-6 h-6 text-cyan-400" />
          <span className="font-display text-xl text-cyan-100 tracking-wide">
            <GlitchText text="GHOSTCHAIN" />
          </span>
        </div>

        <p className="text-center font-mono text-xs text-slate-500 mb-6 uppercase tracking-[0.2em]">
          select node identity to continue
        </p>

        <div className="grid grid-cols-1 gap-3">
          {OPTIONS.map(({ role, icon: Icon, desc }) => (
            <button
              key={role}
              onClick={() => setSelected(role)}
              className={`flex items-center gap-4 cut-corner border px-5 py-4 text-left transition-colors ${
                selected === role
                  ? "border-cyan-400/60 bg-cyan-500/10"
                  : "border-slate-800 bg-slate-900/40 hover:border-cyan-500/30"
              }`}
            >
              <Icon className="w-5 h-5 text-cyan-300 shrink-0" />
              <div>
                <div className="font-display text-cyan-100 text-sm tracking-wide">
                  {ROLE_LABELS[role]}
                </div>
                <div className="font-mono text-[11px] text-slate-500 mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleEnter}
          disabled={!selected}
          className="cut-corner font-display w-full mt-6 bg-cyan-500 py-3 text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Enter Network
        </button>

        <p className="text-center font-mono text-[10px] text-slate-600 mt-4">
          individuals checking personal breach exposure:{" "}
          <a href="/audit-my-data" className="text-cyan-400 underline">
            no login required →
          </a>
        </p>
      </div>
    </div>
  );
}