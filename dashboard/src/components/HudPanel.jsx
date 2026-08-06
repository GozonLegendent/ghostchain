export default function HudPanel({ title, icon: Icon, right, children, className = "" }) {
  return (
    <section className={`relative border border-slate-800 bg-[#070b12]/90 backdrop-blur ${className}`}>
      <span className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-cyan-400" />
      <span className="pointer-events-none absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-cyan-400" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-cyan-400" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-cyan-400" />
      {title ? (
        <div className="hatch flex items-center justify-between border-b border-slate-800 px-4 py-2">
          <h2 className="font-display flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            {Icon ? <Icon className="h-3.5 w-3.5 text-cyan-400" strokeWidth={1.8} /> : null}
            {title}
          </h2>
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}