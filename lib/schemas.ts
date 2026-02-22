import { z } from "zod";

export const SymptomSchema = z.object({
  name: z.string().min(1),
  onset: z.string().min(1),
  duration: z.string().min(1),
  severity: z.number().min(1).max(10),
  progression: z.enum(["improving", "stable", "worsening"]),
});

export const IntakeSchema = z.object({
  demographics: z.object({
    age: z.number().min(0).max(120).nullable(),
    sexAtBirth: z.enum(["female", "male", "intersex", "prefer_not_to_say"]),
    pregnancyPossible: z.boolean().nullable(),
    locationText: z.string().min(1),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  }),
  symptoms: z.array(SymptomSchema).min(1),
  redFlags: z.array(z.string()),
  history: z.object({
    existingConditions: z.array(z.string()),
    medicationsTaken: z.array(z.string()),
    allergies: z.array(z.string()),
  }),
  vitals: z.object({
    temperatureC: z.number().min(30).max(45).nullable(),
    pulseBpm: z.number().min(20).max(240).nullable(),
    spo2: z.number().min(40).max(100).nullable(),
    bpSystolic: z.number().min(60).max(280).nullable(),
    bpDiastolic: z.number().min(30).max(200).nullable(),
  }),
  additionalNotes: z.string(),
});

export const TriageSchema = z.object({
  triageLevel: z.enum(["red", "orange", "yellow", "green"]),
  confidence: z.number().min(0).max(1),
  whyThisTriage: z.string().min(10),
  possibleConditions: z
    .array(
      z.object({
        condition: z.string().min(1),
        likelihood: z.enum(["high", "medium", "low"]),
        rationale: z.string().min(4),
      }),
    )
    .max(5),
  whatToDoNow: z.array(z.string()).min(1).max(8),
  whenToSeekHelp: z.array(z.string()).min(1).max(8),
  whatToTellDoctor: z.array(z.string()).min(1).max(8),
  followUpQuestions: z.array(z.string()).min(1).max(8),
  emergencySignalsDetected: z.array(z.string()).max(10),
  disclaimer: z.string().min(8),
});

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["image", "pdf"]),
  dataUrl: z.string().min(12),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  attachments: z.array(AttachmentSchema).max(4).optional().default([]),
  regenerate: z.boolean().optional().default(false),
});

export const MemorySnapshotSchema = z.object({
  demographics: z.object({
    age: z.number().nullable(),
    sexAtBirth: z.enum(["female", "male", "intersex", "prefer_not_to_say"]),
    pregnancyPossible: z.boolean().nullable(),
    locationText: z.string(),
  }),
  chronicConditions: z.array(z.string()),
  allergies: z.array(z.string()),
  medications: z.array(z.string()),
  importantEvents: z.array(z.string()),
  currentEpisode: z.object({
    symptomsTimeline: z.string(),
    redFlags: z.array(z.string()),
    triageLevel: z.enum(["red", "orange", "yellow", "green"]),
    summary: z.string(),
  }),
  lastUpdated: z.string(),
});

export const MemoryPatchSchema = z.object({
  chronicConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  importantEvents: z.array(z.string()).optional(),
  locationText: z.string().optional(),
});

export const ReferralNoteSchema = z.object({
  patientBasics: z.object({
    age: z.number().nullable(),
    sexAtBirth: z.enum(["female", "male", "intersex", "prefer_not_to_say"]),
    location: z.string(),
  }),
  symptomsTimeline: z.string(),
  redFlagsChecked: z.array(z.string()),
  vitalsReported: z.object({
    temperatureC: z.number().nullable(),
    pulseBpm: z.number().nullable(),
    spo2: z.number().nullable(),
    bpSystolic: z.number().nullable(),
    bpDiastolic: z.number().nullable(),
  }),
  suspectedConditions: z
    .array(
      z.object({
        condition: z.string(),
        likelihood: z.enum(["high", "medium", "low"]),
        rationale: z.string(),
      }),
    )
    .max(6),
  suggestedTests: z.array(z.string()),
  medicationsTaken: z.array(z.string()),
  allergies: z.array(z.string()),
  triageLevel: z.enum(["red", "orange", "yellow", "green"]),
  recommendedUrgency: z.string(),
  doctorHandoffSummary: z.string(),
  generatedAt: z.string(),
  conversationId: z.string().uuid(),
});

export type IntakeInput = z.infer<typeof IntakeSchema>;
export type TriageOutput = z.infer<typeof TriageSchema>;
export type MemorySnapshotInput = z.infer<typeof MemorySnapshotSchema>;
export type ReferralNoteInput = z.infer<typeof ReferralNoteSchema>;
