import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hexagon, ShieldCheck, Building2, Loader2 } from "lucide-react";
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function selectIdentity(role) {
    setSelected(role);
    setError(null);
  }

  async function handleEnter(e) {
    e.preventDefault();
    if (!selected || !username || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(selected, username, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              onClick={() => selectIdentity(role)}
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

        {selected && (
          <form onSubmit={handleEnter} className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-400/60 outline-none px-4 py-2.5 font-mono text-sm text-slate-200 cut-corner"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-400/60 outline-none px-4 py-2.5 font-mono text-sm text-slate-200 cut-corner"
            />

            {error && (
              <p className="font-mono text-xs text-rose-400">// {error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="cut-corner font-display flex items-center justify-center gap-2 w-full bg-cyan-500 py-3 text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Authenticating…" : "Enter Network"}
            </button>
          </form>
        )}

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