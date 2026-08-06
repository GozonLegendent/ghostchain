import { useEffect, useRef } from "react";
import { animate } from "motion/react";

export default function CountUp({ value }) {
  const ref = useRef(null);
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.9,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);

  return <span ref={ref}>0</span>;
}