import { hasLLMEnv } from "@/lib/env";
import { getLLMClient, getLLMModel } from "@/lib/llm/client";
import { parseJsonFromText } from "@/lib/llm/json";
import {
  MEDICAL_DISCLAIMER,
  triageSystemPrompt,
  triageUserPrompt,
} from "@/lib/llm/prompts";
import { TriageSchema } from "@/lib/schemas";
import type { IntakePayload, MemorySnapshot, TriageResult } from "@/lib/types";
import { compactText } from "@/lib/utils";

const EMERGENCY_KEYWORDS = [
  "chest",
  "breathing",
  "confusion",
  "faint",
  "seizure",
  "bleeding",
  "blue lips",
  "weakness",
  "stroke",
];

function emergencyFromVitals(input: IntakePayload) {
  const signals: string[] = [];
  if (input.vitals.spo2 !== null && input.vitals.spo2 <= 91) {
    signals.push(`Low oxygen saturation (${input.vitals.spo2}%)`);
  }
  if (input.vitals.pulseBpm !== null && input.vitals.pulseBpm >= 130) {
    signals.push(`Very high pulse (${input.vitals.pulseBpm} bpm)`);
  }
  if (input.vitals.temperatureC !== null && input.vitals.temperatureC >= 40) {
    signals.push(`Very high temperature (${input.vitals.temperatureC} C)`);
  }
  return signals;
}

function classifyByRules(input: IntakePayload): TriageResult {
  const redFlagMatches = input.redFlags.filter((flag) => {
    const normalized = flag.toLowerCase();
    return EMERGENCY_KEYWORDS.some((keyword) => normalized.includes(keyword));
  });
  const vitalSignals = emergencyFromVitals(input);
  const severeSymptoms = input.symptoms.filter(
    (symptom) => symptom.severity >= 8,
  );

  let triageLevel: TriageResult["triageLevel"] = "green";
  if (redFlagMatches.length || vitalSignals.length) {
    triageLevel = "red";
  } else if (
    severeSymptoms.length ||
    input.symptoms.some((s) => s.progression === "worsening")
  ) {
    triageLevel = "orange";
  } else if (input.symptoms.some((s) => s.severity >= 4)) {
    triageLevel = "yellow";
  }

  const urgencyText =
    triageLevel === "red"
      ? "Emergency symptoms may be present and urgent in-person care is needed now."
      : triageLevel === "orange"
        ? "Symptoms could worsen and should be assessed by a clinician within 24 hours."
        : triageLevel === "yellow"
          ? "Current symptoms appear moderate and can start with home care while monitoring closely."
          : "Symptoms currently appear lower risk, with watchful monitoring advised.";

  const emergencySignalsDetected = [...redFlagMatches, ...vitalSignals];

  return {
    triageLevel,
    confidence: triageLevel === "red" ? 0.88 : 0.62,
    whyThisTriage: urgencyText,
    possibleConditions: input.symptoms.slice(0, 3).map((symptom) => ({
      condition: `${symptom.name} related illness`,
      likelihood: symptom.severity >= 7 ? "medium" : "low",
      rationale: `Based on reported ${symptom.name.toLowerCase()} severity and timeline.`,
    })),
    whatToDoNow:
      triageLevel === "red"
        ? [
            "Call local emergency services immediately.",
            "Do not travel alone if you feel faint or breathless.",
            "Carry current medication/allergy information.",
          ]
        : [
            "Hydrate and rest.",
            "Track temperature, pulse, and symptom changes every 4-6 hours.",
            "Avoid new over-the-counter medications if allergy history is unclear.",
          ],
    whenToSeekHelp: [
      "If breathing difficulty, chest pain, confusion, or fainting starts.",
      "If high fever persists or symptoms worsen rapidly.",
      triageLevel === "orange"
        ? "Arrange doctor review in the next 24 hours."
        : "Arrange doctor review if no improvement within 24-48 hours.",
    ],
    whatToTellDoctor: [
      "Symptom timeline (onset, duration, progression).",
      "Any red flags and measured vitals.",
      "Current medications and known allergies.",
    ],
    followUpQuestions: [
      "Are symptoms getting worse right now?",
      "Any new chest pain, confusion, or breathing difficulty?",
      "Can you share latest temperature, pulse, and oxygen level?",
    ],
    emergencySignalsDetected,
    disclaimer: MEDICAL_DISCLAIMER,
  };
}

export async function generateTriage(
  input: IntakePayload,
): Promise<TriageResult> {
  const fallback = classifyByRules(input);
  if (!hasLLMEnv()) {
    return fallback;
  }

  try {
    const client = getLLMClient();
    const completion = await client.chat.completions.create({
      model: getLLMModel(),
      temperature: 0.2,
      messages: [
        { role: "system", content: triageSystemPrompt() },
        { role: "user", content: triageUserPrompt(input) },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonFromText(content, fallback);
    const validated = TriageSchema.safeParse(parsed);
    if (!validated.success) {
      return fallback;
    }

    return {
      ...validated.data,
      disclaimer: MEDICAL_DISCLAIMER,
      whyThisTriage: compactText(validated.data.whyThisTriage, 520),
    };
  } catch {
    return fallback;
  }
}

export function buildMemoryFromIntake(
  input: IntakePayload,
  triage: TriageResult,
): MemorySnapshot {
  const timeline = input.symptoms
    .map(
      (symptom) =>
        `${symptom.name} started ${symptom.onset}, ${symptom.duration}, severity ${symptom.severity}/10 and ${symptom.progression}.`,
    )
    .join(" ");

  return {
    demographics: {
      age: input.demographics.age,
      sexAtBirth: input.demographics.sexAtBirth,
      pregnancyPossible: input.demographics.pregnancyPossible,
      locationText: input.demographics.locationText,
    },
    chronicConditions: input.history.existingConditions,
    allergies: input.history.allergies,
    medications: input.history.medicationsTaken,
    importantEvents: [
      `Initial triage set to ${triage.triageLevel.toUpperCase()} on ${new Date().toISOString()}.`,
    ],
    currentEpisode: {
      symptomsTimeline: timeline,
      redFlags: input.redFlags,
      triageLevel: triage.triageLevel,
      summary: triage.whyThisTriage,
    },
    lastUpdated: new Date().toISOString(),
  };
}

export function updateMemoryWithChat(
  snapshot: MemorySnapshot,
  userMessage: string,
  assistantMessage: string,
): MemorySnapshot {
  return {
    ...snapshot,
    importantEvents: [
      ...snapshot.importantEvents.slice(-7),
      `Conversation update: ${compactText(userMessage, 140)}`,
    ],
    currentEpisode: {
      ...snapshot.currentEpisode,
      summary: compactText(
        `${snapshot.currentEpisode.summary} ${assistantMessage}`,
        600,
      ),
    },
    lastUpdated: new Date().toISOString(),
  };
}
