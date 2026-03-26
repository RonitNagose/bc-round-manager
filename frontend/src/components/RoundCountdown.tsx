import { useEffect, useMemo, useState } from "react";

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function parseUtcMs(value: string) {
  // Backend sends ISO strings; Date.parse interprets timezone correctly (including "Z" offsets).
  // If parsing fails, return NaN so the UI can fall back safely.
  return Date.parse(value);
}

export default function RoundCountdown({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) {
  const startMs = useMemo(() => parseUtcMs(startTime), [startTime]);
  const endMs = useMemo(() => parseUtcMs(endTime), [endTime]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const invalid = !Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs;

  const phase: "beforeStart" | "active" | "afterEnd" =
    invalid ? "afterEnd" : now < startMs ? "beforeStart" : now < endMs ? "active" : "afterEnd";

  const label = phase === "beforeStart" ? "Starts in" : phase === "active" ? "Ends in" : "Round Closed";
  const remainingMs = phase === "beforeStart" ? startMs - now : phase === "active" ? endMs - now : 0;

  return (
    <div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {phase === "afterEnd" ? "Round Closed" : formatMs(remainingMs)}
      </div>
    </div>
  );
}
