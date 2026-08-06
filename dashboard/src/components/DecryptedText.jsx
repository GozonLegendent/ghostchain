import { useEffect, useState } from "react";

const CHARS = "ABCDEF0123456789#$%&@";

export default function DecryptedText({ text, speed = 28, className = "" }) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    let frame = 0;
    const t = setInterval(() => {
      frame += 1;
      const revealed = Math.floor(frame / 2);
      setOut(
        text
          .split("")
          .map((c, i) =>
            i < revealed || c === " " ? c : CHARS[Math.floor(Math.random() * CHARS.length)]
          )
          .join("")
      );
      if (revealed >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);

  return <span className={className}>{out}</span>;
}