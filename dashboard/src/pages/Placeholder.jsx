export default function Placeholder({ title, phase, desc }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="max-w-md text-sm text-slate-500">{desc}</p>
      <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">{phase}</span>
    </main>
  );
}