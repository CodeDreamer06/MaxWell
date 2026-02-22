import type { IntakePayload, TriageLevel } from "@/lib/types";

export const TRIAGE_META: Record<
  TriageLevel,
  { label: string; color: string; panel: string; ring: string }
> = {
  red: {
    label: "Emergency Now",
    color: "text-red-200",
    panel: "from-red-500/30 to-rose-700/30",
    ring: "ring-red-300/60",
  },
  orange: {
    label: "Doctor Within 24h",
    color: "text-orange-100",
    panel: "from-orange-500/30 to-amber-600/30",
    ring: "ring-orange-200/60",
  },
  yellow: {
    label: "Home Care + Monitor",
    color: "text-yellow-100",
    panel: "from-yellow-500/25 to-lime-600/25",
    ring: "ring-yellow-200/55",
  },
  green: {
    label: "Low Risk, Observe",
    color: "text-emerald-100",
    panel: "from-emerald-500/25 to-green-700/25",
    ring: "ring-emerald-200/50",
  },
};

export const RED_FLAG_OPTIONS = [
  "Chest pain or pressure",
  "Severe breathing difficulty",
  "Confusion or hard to wake",
  "Fainting or collapse",
  "Seizure",
  "Uncontrolled bleeding",
  "Sudden one-sided weakness",
  "Blue lips or face",
  "Severe dehydration",
  "Persistent high fever",
  "Severe abdominal pain",
  "Pregnancy warning signs",
];

export const DEMO_INTAKE_TEMPLATE: IntakePayload = {
  demographics: {
    age: 52,
    sexAtBirth: "female",
    pregnancyPossible: false,
    locationText: "Nashik, Maharashtra",
    latitude: 19.9975,
    longitude: 73.7898,
  },
  symptoms: [
    {
      name: "Fever",
      onset: "2 days ago",
      duration: "constant",
      severity: 6,
      progression: "stable",
    },
    {
      name: "Cough",
      onset: "3 days ago",
      duration: "intermittent",
      severity: 5,
      progression: "worsening",
    },
  ],
  redFlags: ["Severe breathing difficulty"],
  history: {
    existingConditions: ["Type 2 diabetes"],
    medicationsTaken: ["Paracetamol 500mg"],
    allergies: ["Penicillin"],
  },
  vitals: {
    temperatureC: 38.4,
    pulseBpm: 104,
    spo2: 92,
    bpSystolic: 142,
    bpDiastolic: 92,
  },
  additionalNotes: "Lives 25 km from district hospital.",
};
