import { motion } from "framer-motion";
import { cn, scoreColor } from "@/lib/utils";

/** Radial score dial. The arc animates from zero so a re-run reads as movement. */
export function ScoreGauge({
  score,
  label,
  sublabel,
  size = 168,
  className,
}: {
  score: number;
  label?: string;
  sublabel?: string;
  size?: number;
  className?: string;
}) {
  const stroke = size > 120 ? 9 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--lp-line)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="num font-semibold tracking-tight text-ink"
          style={{ fontSize: size * 0.26 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          {Math.round(clamped)}
        </motion.span>
        {label && <span className="mt-0.5 text-[0.6875rem] font-medium tracking-wide text-ink-mute uppercase">{label}</span>}
        {sublabel && <span className="mt-0.5 text-[0.65rem] text-ink-faint">{sublabel}</span>}
      </div>
    </div>
  );
}

/** Horizontal criterion bar used for rubric breakdowns. */
export function ScoreBar({
  label,
  score,
  reasoning,
  delay = 0,
}: {
  label: string;
  score: number;
  reasoning?: string;
  delay?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-ink">{label}</span>
        <span className="num text-[0.8125rem] text-ink-mute">{Math.round(clamped)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-overlay">
        <motion.div
          className="h-full rounded-full"
          style={{ background: scoreColor(clamped) }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {reasoning && <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-mute">{reasoning}</p>}
    </div>
  );
}
