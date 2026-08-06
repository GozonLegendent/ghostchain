import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export default function Map3D({ children }) {
  const ref = useRef(null);
  const [cross, setCross] = useState(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 55, damping: 15 });
  const ry = useSpring(useMotionValue(0), { stiffness: 55, damping: 15 });

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 10);
    rx.set(-py * 8);
    setCross({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    setCross(null);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden"
      style={{ perspective: 1100 }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}>
        <div
          className="grid-floor pointer-events-none absolute inset-x-6 bottom-0 h-44"
          style={{ transform: "rotateX(55deg) translateZ(-70px)" }}
        />
        <div style={{ transform: "translateZ(28px)" }}>{children}</div>
        <div
          className="pointer-events-none absolute left-4 top-3 font-mono text-[9px] tracking-widest text-cyan-400/90"
          style={{ transform: "translateZ(70px)" }}
        >
          SCAN.MODE // ACTIVE
        </div>
        <div
          className="pointer-events-none absolute bottom-3 right-4 font-mono text-[9px] tracking-widest text-slate-500"
          style={{ transform: "translateZ(70px)" }}
        >
          GRID.SECTOR 07-A
        </div>
      </motion.div>

      {cross ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute h-full w-px bg-cyan-400/25" style={{ left: cross.x }} />
          <div className="absolute h-px w-full bg-cyan-400/25" style={{ top: cross.y }} />
          <div
            className="absolute font-mono text-[9px] text-cyan-300"
            style={{ left: cross.x + 12, top: cross.y + 10 }}
          >
            {String(Math.round(cross.x)).padStart(3, "0")}.{String(Math.round(cross.y)).padStart(3, "0")}
          </div>
        </div>
      ) : null}
    </div>
  );
}