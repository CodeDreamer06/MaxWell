import { TRIAGE_META } from "@/lib/constants";
import type { TriageLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const dotColor: Record<TriageLevel, string> = {
  red: "bg-red-300",
  orange: "bg-orange-300",
  yellow: "bg-yellow-300",
  green: "bg-emerald-300",
};

export function TriageBadge({ level }: { level: TriageLevel }) {
  const meta = TRIAGE_META[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide uppercase",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotColor[level])} />
      <span className={meta.color}>{meta.label}</span>
    </span>
  );
}
