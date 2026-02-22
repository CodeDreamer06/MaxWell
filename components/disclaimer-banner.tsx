import { MEDICAL_DISCLAIMER } from "@/lib/llm/prompts";

export function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-red-200/25 bg-red-950/30 px-3 py-2 text-xs text-red-100/90"
          : "rounded-2xl border border-red-200/25 bg-red-950/30 p-4 text-sm text-red-100/90"
      }
    >
      {MEDICAL_DISCLAIMER}
    </div>
  );
}
