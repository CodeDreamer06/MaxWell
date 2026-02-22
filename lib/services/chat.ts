import type {
  AttachmentInput,
  IntakePayload,
  MemorySnapshot,
} from "@/lib/types";
import { compactText, uniqueStrings } from "@/lib/utils";

export function buildAttachmentSummary(
  attachments: Array<AttachmentInput & { extractedText?: string }>,
) {
  if (!attachments.length) {
    return "";
  }

  const chunks = attachments.map((attachment) => {
    if (attachment.kind === "pdf") {
      return `PDF (${attachment.name}) excerpt: ${compactText(attachment.extractedText ?? "", 1200)}`;
    }
    return `Image (${attachment.name}) attached.`;
  });

  return chunks.join("\n");
}

export function memorySummary(memory: MemorySnapshot | null) {
  if (!memory) {
    return "No memory snapshot yet.";
  }

  return [
    `Demographics: age ${memory.demographics.age ?? "unknown"}, sex ${memory.demographics.sexAtBirth}, location ${memory.demographics.locationText}.`,
    `Conditions: ${memory.chronicConditions.join(", ") || "none reported"}.`,
    `Allergies: ${memory.allergies.join(", ") || "none reported"}.`,
    `Current episode: ${memory.currentEpisode.summary}`,
  ].join(" ");
}

export function composeIntakeContext(intakePayload: IntakePayload | null) {
  if (!intakePayload) {
    return "";
  }

  const symptoms = intakePayload.symptoms
    .map(
      (symptom) =>
        `${symptom.name} (${symptom.onset}, ${symptom.duration}, ${symptom.severity}/10, ${symptom.progression})`,
    )
    .join("; ");

  return [
    `Intake summary: ${symptoms}.`,
    `Reported red flags: ${intakePayload.redFlags.join(", ") || "none"}.`,
    `Current meds: ${intakePayload.history.medicationsTaken.join(", ") || "none"}.`,
  ].join(" ");
}

export function deriveSuggestedQuestions(args: {
  memory: MemorySnapshot | null;
  userPrompt: string;
}) {
  const base = [
    "What warning signs should make me go immediately?",
    "What should I monitor over the next 6 hours?",
    "What should I tell the doctor first?",
  ];

  if (args.memory?.currentEpisode.triageLevel === "red") {
    base.unshift("Should I call an ambulance right now?");
  }

  if (/child|baby|infant/i.test(args.userPrompt)) {
    base.unshift("What changes in children are emergency signs?");
  }

  return uniqueStrings(base).slice(0, 4);
}
