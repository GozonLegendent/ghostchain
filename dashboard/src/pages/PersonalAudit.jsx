import { useState } from "react";
import { Hexagon, ShieldQuestion, ArrowLeft, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import GlitchText from "../components/GlitchText";
import { lookupIdentifier } from "../api";

export default function PersonalAudit() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  async function handleCheck(e) {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;
    setChecking(true);
    setError(null);
    setResults(null);
    try {
      const [byUsername, byEmail] = await Promise.all([
        lookupIdentifier(username.trim()),
        lookupIdentifier(email.trim()),
      ]);

      const merged = byUsername.map((u, i) => {
        const e2 = byEmail[i];
        if (!u.data && !e2.data) return { org: u.org, data: null };
        const exposed = Boolean(u.data?.exposed) || Boolean(e2.data?.exposed);
        return {
          org: u.org,
          data: {
            org: u.org.id,
            exposed,
            matches: [],
          },
        };
      });

      setResults(merged);
    } catch (err) {
      setError("could not reach the network — try again");
    } finally {
      setChecking(false);
    }
  }

  const anyExposed = results?.some((r) => r.data?.exposed);
  const reachable = results?.filter((r) => r.data !== null) ?? [];

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-2">
          <Hexagon className="w-6 h-6 text-cyan-400" />
          <span className="font-display text-xl text-cyan-100 tracking-wide">
            <GlitchText text="GHOSTCHAIN" />
          </span>
        </div>
        <p className="text-center font-mono text-xs text-slate-500 mb-8 uppercase tracking-[0.2em]">
          Personal Right-to-Audit
        </p>

        <div className="cut-corner border border-cyan-500/30 bg-slate-900/40 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldQuestion className="w-5 h-5 text-cyan-300" />
            <h1 className="font-display text-cyan-100 text-sm uppercase tracking-wider">
              Was your data part of a breach?
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-500 mb-5 leading-relaxed">
            Submit your username and email below. Each is cryptographically checked against every
            participating organization's breach commitments using zero-knowledge Merkle proofs —
            we return only a match/no-match signal, and no organization ever sees your plaintext
            identifiers or full dataset.
          </p>

          <form onSubmit={handleCheck} className="space-y-3">
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-400/60 outline-none px-4 py-2.5 font-mono text-sm text-slate-200 cut-corner"
            />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-400/60 outline-none px-4 py-2.5 font-mono text-sm text-slate-200 cut-corner"
            />
            <button
              type="submit"
              disabled={checking || !username.trim() || !email.trim()}
              className="cut-corner font-display flex items-center justify-center gap-2 w-full bg-cyan-500 py-2.5 text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 disabled:opacity-50"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {checking ? "Checking…" : "Check My Exposure"}
            </button>
          </form>

          {error && (
            <p className="mt-4 font-mono text-xs text-rose-400">// {error}</p>
          )}

          {results && (
            <div className="mt-5 space-y-3">
              <div
                className={`border p-4 cut-corner flex items-center gap-3 ${
                  anyExposed ? "border-rose-500/40 bg-rose-500/5" : "border-emerald-500/40 bg-emerald-500/5"
                }`}
              >
                {anyExposed ? (
                  <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                )}
                <div>
                  <p className={`font-display text-sm font-bold tracking-wide ${anyExposed ? "text-rose-300" : "text-emerald-300"}`}>
                    {anyExposed ? "EXPOSURE FOUND" : "NO EXPOSURE FOUND"}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                    checked against {reachable.length} of {results.length} network node{results.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {results.map(({ org, data }) => (
                <div key={org.id} className="border border-slate-800 bg-slate-950/60 p-4 cut-corner">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-cyan-200">{org.name}</span>
                    {!data ? (
                      <span className="font-mono text-[10px] text-slate-500">unreachable</span>
                    ) : data.exposed ? (
                      <span className="font-mono text-[10px] text-rose-300">EXPOSED</span>
                    ) : (
                      <span className="font-mono text-[10px] text-emerald-300">CLEAR</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 mt-6 font-mono text-xs text-slate-500 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to organization login
        </Link>
      </div>
    </div>
  );
}