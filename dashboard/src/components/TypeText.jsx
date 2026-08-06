import { useEffect, useState } from "react";

export default function TypeText({ text, speed = 12, className = "" }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    const t = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);

  return (
    <span className={className}>
      {text.slice(0, n)}
      {n < text.length ? <span className="cursor-blink text-cyan-400">▌</span> : null}
    </span>
  );
}