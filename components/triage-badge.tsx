import { TRIAGE_META } from "@/lib/constants";
import type { TriageLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const badgeTone: Record<TriageLevel, string> = {
  red: "border-red-200/40 bg-red-900/30 text-red-50",
  orange: "border-orange-200/35 bg-orange-900/25 text-orange-50",
  yellow: "border-yellow-200/35 bg-yellow-900/20 text-yellow-50",
  green: "border-emerald-200/35 bg-emerald-900/25 text-emerald-50",
};

const dotColor: Record<TriageLevel, string> = {
  red: "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)]",
  orange: "bg-orange-300 shadow-[0_0_10px_rgba(253,186,116,0.7)]",
  yellow: "bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.65)]",
  green: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.65)]",
};

export function TriageBadge({ level }: { level: TriageLevel }) {
  const meta = TRIAGE_META[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        badgeTone[level],
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          dotColor[level],
          level === "red" ? "pulse-dot" : "",
        )}
      />
      <span className={meta.color}>{meta.label}</span>
    </span>
  );
}
