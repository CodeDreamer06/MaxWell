export type TriageLevel = "red" | "orange" | "yellow" | "green";

export type SexAtBirth = "female" | "male" | "intersex" | "prefer_not_to_say";
export type SymptomProgression = "improving" | "stable" | "worsening";

export interface SymptomEntry {
  name: string;
  onset: string;
  duration: string;
  severity: number;
  progression: SymptomProgression;
}

export interface Demographics {
  age: number | null;
  sexAtBirth: SexAtBirth;
  pregnancyPossible: boolean | null;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
}

export interface HistoryData {
  existingConditions: string[];
  medicationsTaken: string[];
  allergies: string[];
}

export interface VitalsData {
  temperatureC: number | null;
  pulseBpm: number | null;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
}

export interface IntakePayload {
  demographics: Demographics;
  symptoms: SymptomEntry[];
  redFlags: string[];
  history: HistoryData;
  vitals: VitalsData;
  additionalNotes: string;
}

export interface PossibleCondition {
  condition: string;
  likelihood: "high" | "medium" | "low";
  rationale: string;
}

export interface TriageResult {
  triageLevel: TriageLevel;
  confidence: number;
  whyThisTriage: string;
  possibleConditions: PossibleCondition[];
  whatToDoNow: string[];
  whenToSeekHelp: string[];
  whatToTellDoctor: string[];
  followUpQuestions: string[];
  emergencySignalsDetected: string[];
  disclaimer: string;
}

export interface EpisodeSummary {
  symptomsTimeline: string;
  redFlags: string[];
  triageLevel: TriageLevel;
  summary: string;
}

export interface MemorySnapshot {
  demographics: {
    age: number | null;
    sexAtBirth: SexAtBirth;
    pregnancyPossible: boolean | null;
    locationText: string;
  };
  chronicConditions: string[];
  allergies: string[];
  medications: string[];
  importantEvents: string[];
  currentEpisode: EpisodeSummary;
  lastUpdated: string;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant";
  content: string;
  isImportant: boolean;
  createdAt: string;
}

export interface HospitalResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  phone: string | null;
  website: string | null;
  openHours: string | null;
}

export interface ReferralNote {
  patientBasics: {
    age: number | null;
    sexAtBirth: SexAtBirth;
    location: string;
  };
  symptomsTimeline: string;
  redFlagsChecked: string[];
  vitalsReported: VitalsData;
  suspectedConditions: PossibleCondition[];
  suggestedTests: string[];
  medicationsTaken: string[];
  allergies: string[];
  triageLevel: TriageLevel;
  recommendedUrgency: string;
  doctorHandoffSummary: string;
  generatedAt: string;
  conversationId: string;
}

export interface AttachmentInput {
  id: string;
  name: string;
  kind: "image" | "pdf";
  dataUrl: string;
}
