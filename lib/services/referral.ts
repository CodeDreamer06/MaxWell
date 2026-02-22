import { hasLLMEnv } from "@/lib/env";
import { getLLMClient, getLLMModel } from "@/lib/llm/client";
import { parseJsonFromText } from "@/lib/llm/json";
import { referralSystemPrompt } from "@/lib/llm/prompts";
import { ReferralNoteSchema } from "@/lib/schemas";
import type {
  ChatMessageRecord,
  IntakePayload,
  ReferralNote,
  TriageResult,
} from "@/lib/types";

export function referralFallback(args: {
  conversationId: string;
  intake: IntakePayload | null;
  triage: TriageResult | null;
  messages: ChatMessageRecord[];
}): ReferralNote {
  const intake = args.intake;
  const triage = args.triage;

  return {
    patientBasics: {
      age: intake?.demographics.age ?? null,
      sexAtBirth: intake?.demographics.sexAtBirth ?? "prefer_not_to_say",
      location: intake?.demographics.locationText ?? "Unknown",
    },
    symptomsTimeline:
      intake?.symptoms
        .map(
          (symptom) =>
            `${symptom.name} (${symptom.onset}, ${symptom.duration}, ${symptom.severity}/10, ${symptom.progression})`,
        )
        .join("; ") ?? "Not enough symptom detail in intake.",
    redFlagsChecked: intake?.redFlags ?? [],
    vitalsReported: intake?.vitals ?? {
      temperatureC: null,
      pulseBpm: null,
      spo2: null,
      bpSystolic: null,
      bpDiastolic: null,
    },
    suspectedConditions: triage?.possibleConditions ?? [],
    suggestedTests: [
      "CBC",
      "CRP/ESR",
      "Pulse oximetry",
      "Clinician-directed focused exam",
    ],
    medicationsTaken: intake?.history.medicationsTaken ?? [],
    allergies: intake?.history.allergies ?? [],
    triageLevel: triage?.triageLevel ?? "yellow",
    recommendedUrgency:
      triage?.triageLevel === "red"
        ? "Immediate emergency care"
        : triage?.triageLevel === "orange"
          ? "Doctor review within 24 hours"
          : "Monitor and seek review if worsening",
    doctorHandoffSummary:
      args.messages
        .slice(-6)
        .map((message) => `${message.role}: ${message.content}`)
        .join(" ") || "No prior chat summary.",
    generatedAt: new Date().toISOString(),
    conversationId: args.conversationId,
  };
}

export async function generateReferralNote(args: {
  conversationId: string;
  intake: IntakePayload | null;
  triage: TriageResult | null;
  messages: ChatMessageRecord[];
}) {
  const fallback = referralFallback(args);
  if (!hasLLMEnv()) {
    return fallback;
  }

  try {
    const client = getLLMClient();
    const completion = await client.chat.completions.create({
      model: getLLMModel(),
      temperature: 0.1,
      messages: [
        { role: "system", content: referralSystemPrompt() },
        {
          role: "user",
          content: JSON.stringify(
            {
              conversationId: args.conversationId,
              intake: args.intake,
              triage: args.triage,
              lastMessages: args.messages.slice(-12),
            },
            null,
            2,
          ),
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonFromText(text, fallback);
    const validated = ReferralNoteSchema.safeParse(parsed);
    if (!validated.success) {
      return fallback;
    }

    return validated.data;
  } catch {
    return fallback;
  }
}
