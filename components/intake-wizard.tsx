"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { TriageBadge } from "@/components/triage-badge";
import {
  DEMO_INTAKE_TEMPLATE,
  RED_FLAG_OPTIONS,
  TRIAGE_META,
} from "@/lib/constants";
import { IntakeSchema } from "@/lib/schemas";
import type { IntakePayload, SymptomEntry, TriageResult } from "@/lib/types";

function createDefaultSymptom(): SymptomEntry {
  return {
    name: "",
    onset: "",
    duration: "",
    severity: 5,
    progression: "stable",
  };
}

function createSymptomUiKey() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const baseIntake: IntakePayload = {
  demographics: {
    age: null,
    sexAtBirth: "prefer_not_to_say",
    pregnancyPossible: null,
    locationText: "",
    latitude: null,
    longitude: null,
  },
  symptoms: [createDefaultSymptom()],
  redFlags: [],
  history: {
    existingConditions: [],
    medicationsTaken: [],
    allergies: [],
  },
  vitals: {
    temperatureC: null,
    pulseBpm: null,
    spo2: null,
    bpSystolic: null,
    bpDiastolic: null,
  },
  additionalNotes: "",
};

function csvToList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function safeNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarizeIssues(
  issues: Array<{ path: Array<PropertyKey>; message: string }>,
) {
  return issues
    .map((issue) => {
      const path = issue.path.length
        ? issue.path.map((token) => String(token)).join(".")
        : "form";
      return `${path}: ${issue.message}`;
    })
    .join(" | ");
}

function buildPayload(
  intake: IntakePayload,
  fields: {
    existingConditions: string;
    medications: string;
    allergies: string;
  },
): IntakePayload {
  const normalizedSymptoms = intake.symptoms
    .map((symptom) => ({
      name: symptom.name.trim(),
      onset: symptom.onset.trim() || "Not specified",
      duration: symptom.duration.trim() || "Not specified",
      severity:
        typeof symptom.severity === "number" &&
        Number.isFinite(symptom.severity)
          ? symptom.severity
          : 5,
      progression: symptom.progression,
    }))
    .filter((symptom) => symptom.name.length > 0);

  const latitude = safeNumber(intake.demographics.latitude);
  const longitude = safeNumber(intake.demographics.longitude);
  const locationText = intake.demographics.locationText.trim();

  return {
    ...intake,
    demographics: {
      ...intake.demographics,
      age: safeNumber(intake.demographics.age),
      locationText:
        locationText ||
        (latitude !== null && longitude !== null
          ? `Approx. coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          : ""),
      latitude,
      longitude,
    },
    symptoms: normalizedSymptoms,
    history: {
      existingConditions: csvToList(fields.existingConditions),
      medicationsTaken: csvToList(fields.medications),
      allergies: csvToList(fields.allergies),
    },
    vitals: {
      temperatureC: safeNumber(intake.vitals.temperatureC),
      pulseBpm: safeNumber(intake.vitals.pulseBpm),
      spo2: safeNumber(intake.vitals.spo2),
      bpSystolic: safeNumber(intake.vitals.bpSystolic),
      bpDiastolic: safeNumber(intake.vitals.bpDiastolic),
    },
    additionalNotes: intake.additionalNotes.trim(),
  };
}

async function reverseLookup(lat: number, lng: number) {
  try {
    const response = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`);
    if (!response.ok) {
      return "";
    }
    const data = (await response.json()) as { placeName?: string };
    return data.placeName?.trim() ?? "";
  } catch {
    return "";
  }
}

export function IntakeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [autoGeoAttempted, setAutoGeoAttempted] = useState(false);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [existingConditions, setExistingConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [symptomUiKeys, setSymptomUiKeys] = useState(() =>
    baseIntake.symptoms.map(() => createSymptomUiKey()),
  );
  const [intake, setIntake] = useState<IntakePayload>(() =>
    structuredClone(baseIntake),
  );

  const stepTitle = useMemo(
    () =>
      ["Basics", "Symptoms", "Red Flags", "History + Vitals", "Review"][step],
    [step],
  );

  const applyCoordinates = useCallback(
    async (
      latitude: number,
      longitude: number,
      source: "auto" | "manual",
      fallback?: string,
    ) => {
      const roundedLat = Number(latitude.toFixed(6));
      const roundedLng = Number(longitude.toFixed(6));
      const resolvedName = await reverseLookup(roundedLat, roundedLng);
      const nextLocationText =
        resolvedName ||
        fallback ||
        `Approx. coordinates (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`;

      setIntake((previous) => ({
        ...previous,
        demographics: {
          ...previous.demographics,
          latitude: roundedLat,
          longitude: roundedLng,
          locationText: previous.demographics.locationText.trim()
            ? previous.demographics.locationText
            : nextLocationText,
        },
      }));

      setLocationStatus(
        source === "auto"
          ? `Auto-detected location: ${nextLocationText}`
          : `Location captured: ${nextLocationText}`,
      );
    },
    [],
  );

  function setSymptom(index: number, next: Partial<SymptomEntry>) {
    setIntake((previous) => {
      const symptoms = [...previous.symptoms];
      symptoms[index] = { ...symptoms[index], ...next };
      return { ...previous, symptoms };
    });
  }

  function addSymptom() {
    setIntake((previous) => ({
      ...previous,
      symptoms: [...previous.symptoms, createDefaultSymptom()],
    }));
    setSymptomUiKeys((previous) => [...previous, createSymptomUiKey()]);
  }

  function removeSymptom(index: number) {
    setIntake((previous) => ({
      ...previous,
      symptoms:
        previous.symptoms.length === 1
          ? previous.symptoms
          : previous.symptoms.filter((_, current) => current !== index),
    }));
    setSymptomUiKeys((previous) =>
      previous.length === 1
        ? previous
        : previous.filter((_, current) => current !== index),
    );
  }

  function toggleRedFlag(flag: string) {
    setIntake((previous) => {
      const hasFlag = previous.redFlags.includes(flag);
      const redFlags = hasFlag
        ? previous.redFlags.filter((item) => item !== flag)
        : [...previous.redFlags, flag];
      return { ...previous, redFlags };
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Browser geolocation is unavailable.");
      return;
    }

    setLocationStatus("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await applyCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          "manual",
        );
      },
      (geoError) => {
        console.error("[MaxWell][Intake] Geolocation failed", geoError);
        setError(
          "Could not fetch your location. You can continue with manual input.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
    );
  }

  useEffect(() => {
    if (autoGeoAttempted) {
      return;
    }

    setAutoGeoAttempted(true);
    if (!navigator.geolocation) {
      setLocationStatus(
        "Automatic geolocation is not supported in this browser.",
      );
      return;
    }

    setLocationStatus("Attempting automatic location detection...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          "auto",
        );
      },
      () => {
        setLocationStatus(
          "Automatic location was blocked or unavailable. Use the manual location button.",
        );
      },
      { enableHighAccuracy: false, timeout: 5500, maximumAge: 180000 },
    );
  }, [applyCoordinates, autoGeoAttempted]);

  async function submitIntake() {
    setError("");
    setLoading(true);

    const payload = buildPayload(intake, {
      existingConditions,
      medications,
      allergies,
    });

    const localValidation = IntakeSchema.safeParse(payload);
    if (!localValidation.success) {
      const issueSummary = summarizeIssues(localValidation.error.issues);
      setError(`Please fix intake details before submit. ${issueSummary}`);
      console.error("[MaxWell][Intake] Client validation failed", {
        issues: localValidation.error.issues,
        payload,
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: unknown;
        issues?: unknown;
        triage?: TriageResult;
        conversationId?: string;
      };

      if (!response.ok) {
        const detailsText =
          typeof data.details === "object" && data.details !== null
            ? JSON.stringify(data.details)
            : "";
        setError(
          data.error
            ? `${data.error}${detailsText ? `: ${detailsText}` : ""}`
            : "Unable to submit intake.",
        );
        console.error("[MaxWell][Intake] API rejected payload", {
          status: response.status,
          payload,
          response: data,
        });
        setLoading(false);
        return;
      }

      if (!data.triage || !data.conversationId) {
        setError("Intake submitted but response was incomplete.");
        console.error("[MaxWell][Intake] Unexpected success payload", data);
        setLoading(false);
        return;
      }

      setTriage(data.triage);
      setConversationId(data.conversationId);
    } catch (submitError) {
      setError("Unable to submit intake due to network/server failure.");
      console.error("[MaxWell][Intake] Submit failed unexpectedly", {
        error: submitError,
        payload,
      });
    } finally {
      setLoading(false);
    }
  }

  function loadDemoPatient() {
    setError("");
    setLocationStatus("Demo intake values loaded locally.");
    const demo = structuredClone(DEMO_INTAKE_TEMPLATE);
    setIntake(demo);
    setSymptomUiKeys(demo.symptoms.map(() => createSymptomUiKey()));
    setExistingConditions(demo.history.existingConditions.join(", "));
    setMedications(demo.history.medicationsTaken.join(", "));
    setAllergies(demo.history.allergies.join(", "));
    setStep(4);
  }

  if (triage && conversationId) {
    const meta = TRIAGE_META[triage.triageLevel];

    return (
      <section className="space-y-6">
        <div
          className={`card-glass rounded-3xl border p-6 ring-1 ${meta.ring} bg-gradient-to-br ${meta.panel}`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <TriageBadge level={triage.triageLevel} />
            <p className="text-sm text-cyan-50/70">
              Confidence: {(triage.confidence * 100).toFixed(0)}%
            </p>
          </div>
          <h2 className="text-2xl font-semibold">Triage completed</h2>
          <p className="mt-2 text-cyan-50/80">{triage.whyThisTriage}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <article className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
              <h3 className="mb-2 text-sm font-semibold">
                What you can do now
              </h3>
              <ul className="space-y-1 text-xs text-cyan-50/80">
                {triage.whatToDoNow.map((step) => (
                  <li key={step}>- {step}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
              <h3 className="mb-2 text-sm font-semibold">When to seek help</h3>
              <ul className="space-y-1 text-xs text-cyan-50/80">
                {triage.whenToSeekHelp.map((step) => (
                  <li key={step}>- {step}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-white/15 bg-slate-950/35 p-4">
              <h3 className="mb-2 text-sm font-semibold">Tell the doctor</h3>
              <ul className="space-y-1 text-xs text-cyan-50/80">
                {triage.whatToTellDoctor.map((step) => (
                  <li key={step}>- {step}</li>
                ))}
              </ul>
            </article>
          </div>

          {triage.triageLevel === "red" && (
            <div className="mt-5 rounded-xl border border-red-200/40 bg-red-950/45 p-4">
              <p className="text-sm font-semibold text-red-100">
                Emergency signals detected. Call local emergency services now.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href="tel:112"
                  className="rounded-full bg-red-300 px-4 py-2 text-sm font-semibold text-red-950 hover:bg-red-200"
                >
                  Call ambulance
                </a>
                <a
                  href="tel:108"
                  className="rounded-full border border-red-200/50 px-4 py-2 text-sm"
                >
                  Alternate emergency line
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(`/chat?conversationId=${conversationId}`)
              }
              className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Continue to chat
            </button>
            <button
              type="button"
              onClick={() => router.push("/hospitals")}
              className="rounded-full border border-cyan-100/40 px-5 py-2 text-sm"
            >
              Find nearby hospitals
            </button>
            <button
              type="button"
              onClick={() => {
                setTriage(null);
                setConversationId("");
                setIntake(structuredClone(baseIntake));
                setSymptomUiKeys(
                  baseIntake.symptoms.map(() => createSymptomUiKey()),
                );
                setExistingConditions("");
                setMedications("");
                setAllergies("");
                setLocationStatus("");
                setStep(0);
              }}
              className="rounded-full border border-white/20 px-5 py-2 text-sm"
            >
              Start new intake
            </button>
          </div>
        </div>

        <DisclaimerBanner />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="card-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-wider text-cyan-100/70 uppercase">
              Triage-first intake
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              Step {step + 1}: {stepTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={loadDemoPatient}
            className="rounded-full border border-emerald-300/50 px-4 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-200"
          >
            Load demo patient
          </button>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full ${index <= step ? "bg-cyan-300" : "bg-white/10"}`}
            />
          ))}
        </div>
      </header>

      <div className="card-glass rounded-3xl p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Age
              <input
                type="number"
                min={0}
                max={120}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={intake.demographics.age ?? ""}
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    demographics: {
                      ...previous.demographics,
                      age: event.target.value
                        ? Number(event.target.value)
                        : null,
                    },
                  }))
                }
              />
            </label>

            <label className="text-sm">
              Sex at birth
              <select
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={intake.demographics.sexAtBirth}
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    demographics: {
                      ...previous.demographics,
                      sexAtBirth: event.target
                        .value as IntakePayload["demographics"]["sexAtBirth"],
                    },
                  }))
                }
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="intersex">Intersex</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>

            <label className="text-sm sm:col-span-2">
              Location (village/town/city)
              <input
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={intake.demographics.locationText}
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    demographics: {
                      ...previous.demographics,
                      locationText: event.target.value,
                    },
                  }))
                }
              />
              <button
                type="button"
                onClick={useMyLocation}
                className="mt-2 rounded-full border border-cyan-200/40 px-3 py-1 text-xs"
              >
                Use browser geolocation
              </button>
              {locationStatus && (
                <p className="mt-2 text-xs text-cyan-100/80">
                  {locationStatus}
                </p>
              )}
            </label>

            <label className="text-sm sm:col-span-2">
              Pregnancy possible?
              <select
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={
                  intake.demographics.pregnancyPossible === null
                    ? "unknown"
                    : intake.demographics.pregnancyPossible
                      ? "yes"
                      : "no"
                }
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    demographics: {
                      ...previous.demographics,
                      pregnancyPossible:
                        event.target.value === "unknown"
                          ? null
                          : event.target.value === "yes",
                    },
                  }))
                }
              >
                <option value="unknown">Unknown / Not applicable</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {intake.symptoms.map((symptom, index) => (
              <article
                key={symptomUiKeys[index] ?? `symptom-${index}`}
                className="rounded-2xl border border-white/15 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Symptom {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeSymptom(index)}
                    className="text-xs text-red-200/90"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Symptom name (e.g. fever)"
                    className="rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2 text-sm"
                    value={symptom.name}
                    onChange={(event) =>
                      setSymptom(index, { name: event.target.value })
                    }
                  />
                  <input
                    placeholder="Onset (e.g. 2 days ago)"
                    className="rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2 text-sm"
                    value={symptom.onset}
                    onChange={(event) =>
                      setSymptom(index, { onset: event.target.value })
                    }
                  />
                  <input
                    placeholder="Duration (constant/intermittent)"
                    className="rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2 text-sm"
                    value={symptom.duration}
                    onChange={(event) =>
                      setSymptom(index, { duration: event.target.value })
                    }
                  />
                  <select
                    className="rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2 text-sm"
                    value={symptom.progression}
                    onChange={(event) =>
                      setSymptom(index, {
                        progression: event.target
                          .value as SymptomEntry["progression"],
                      })
                    }
                  >
                    <option value="improving">Improving</option>
                    <option value="stable">Stable</option>
                    <option value="worsening">Worsening</option>
                  </select>
                  <label className="text-xs sm:col-span-2">
                    Severity: {symptom.severity}/10
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={symptom.severity}
                      onChange={(event) =>
                        setSymptom(index, {
                          severity: Number(event.target.value),
                        })
                      }
                      className="mt-2 w-full"
                    />
                  </label>
                </div>
              </article>
            ))}

            <button
              type="button"
              onClick={addSymptom}
              className="rounded-full border border-cyan-200/35 px-4 py-2 text-xs"
            >
              Add another symptom
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-sm text-cyan-50/75">
              Select all that apply. These strongly influence emergency triage.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {RED_FLAG_OPTIONS.map((flag) => {
                const selected = intake.redFlags.includes(flag);
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleRedFlag(flag)}
                    className={`rounded-xl border p-3 text-left text-sm transition ${selected ? "border-red-200/60 bg-red-900/35" : "border-white/15 hover:border-white/35"}`}
                  >
                    {flag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              Existing conditions (comma separated)
              <input
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={existingConditions}
                onChange={(event) => setExistingConditions(event.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Medications already taken
              <input
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={medications}
                onChange={(event) => setMedications(event.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Allergies
              <input
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={allergies}
                onChange={(event) => setAllergies(event.target.value)}
              />
            </label>

            <label className="text-sm">
              Temperature (C)
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={intake.vitals.temperatureC ?? ""}
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    vitals: {
                      ...previous.vitals,
                      temperatureC: event.target.value
                        ? Number(event.target.value)
                        : null,
                    },
                  }))
                }
              />
            </label>
            <label className="text-sm">
              Pulse (bpm)
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={intake.vitals.pulseBpm ?? ""}
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    vitals: {
                      ...previous.vitals,
                      pulseBpm: event.target.value
                        ? Number(event.target.value)
                        : null,
                    },
                  }))
                }
              />
            </label>
            <label className="text-sm">
              SpO2 (%)
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={intake.vitals.spo2 ?? ""}
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    vitals: {
                      ...previous.vitals,
                      spo2: event.target.value
                        ? Number(event.target.value)
                        : null,
                    },
                  }))
                }
              />
            </label>
            <label className="text-sm">
              BP (Systolic / Diastolic)
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Systolic"
                  className="rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                  value={intake.vitals.bpSystolic ?? ""}
                  onChange={(event) =>
                    setIntake((previous) => ({
                      ...previous,
                      vitals: {
                        ...previous.vitals,
                        bpSystolic: event.target.value
                          ? Number(event.target.value)
                          : null,
                      },
                    }))
                  }
                />
                <input
                  type="number"
                  placeholder="Diastolic"
                  className="rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                  value={intake.vitals.bpDiastolic ?? ""}
                  onChange={(event) =>
                    setIntake((previous) => ({
                      ...previous,
                      vitals: {
                        ...previous.vitals,
                        bpDiastolic: event.target.value
                          ? Number(event.target.value)
                          : null,
                      },
                    }))
                  }
                />
              </div>
            </label>

            <label className="text-sm sm:col-span-2">
              Additional notes
              <textarea
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/50 px-3 py-2"
                value={intake.additionalNotes}
                onChange={(event) =>
                  setIntake((previous) => ({
                    ...previous,
                    additionalNotes: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-sm text-cyan-50/85">
            <p>
              You are about to run triage with the entered details. MaxWell will
              classify urgency and provide immediate next actions.
            </p>
            <article className="rounded-2xl border border-white/15 p-4">
              <p>
                <strong>Location:</strong>{" "}
                {intake.demographics.locationText || "Not set"}
              </p>
              <p>
                <strong>Symptoms:</strong>{" "}
                {intake.symptoms
                  .map((symptom) => symptom.name)
                  .filter(Boolean)
                  .join(", ") || "Not set"}
              </p>
              <p>
                <strong>Red flags:</strong>{" "}
                {intake.redFlags.join(", ") || "None selected"}
              </p>
            </article>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200/35 bg-red-950/40 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || loading}
          className="rounded-full border border-white/25 px-4 py-2 text-sm disabled:opacity-50"
        >
          Back
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.min(4, current + 1))}
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submitIntake}
            disabled={loading}
            className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-200 disabled:opacity-70"
          >
            {loading ? "Generating triage..." : "Submit and run triage"}
          </button>
        )}
      </div>

      <DisclaimerBanner compact />
    </section>
  );
}
