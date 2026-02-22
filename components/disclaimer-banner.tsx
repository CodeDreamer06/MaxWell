import { AlertIcon } from "@/components/ui-icons";
import { MEDICAL_DISCLAIMER } from "@/lib/llm/prompts";

export function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-red-200/28 bg-red-950/30 px-3 py-2 text-xs text-red-100/90"
          : "rounded-2xl border border-red-200/28 bg-red-950/30 p-4 text-sm text-red-100/90"
      }
    >
      <div className="flex items-start gap-2">
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-200" />
        <span>{MEDICAL_DISCLAIMER}</span>
      </div>
    </div>
  );
}
