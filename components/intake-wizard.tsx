"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { TriageBadge } from "@/components/triage-badge";
import { RED_FLAG_OPTIONS, TRIAGE_META } from "@/lib/constants";
import type { IntakePayload, SymptomEntry, TriageResult } from "@/lib/types";

const defaultSymptom: SymptomEntry = {
  name: "",
  onset: "",
  duration: "",
  severity: 5,
  progression: "stable",
};

const baseIntake: IntakePayload = {
  demographics: {
    age: null,
    sexAtBirth: "prefer_not_to_say",
    pregnancyPossible: null,
    locationText: "",
    latitude: null,
    longitude: null,
  },
  symptoms: [defaultSymptom],
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

export function IntakeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [existingConditions, setExistingConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [intake, setIntake] = useState<IntakePayload>(baseIntake);

  const stepTitle = useMemo(
    () =>
      ["Basics", "Symptoms", "Red Flags", "History + Vitals", "Review"][step],
    [step],
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
      symptoms: [...previous.symptoms, defaultSymptom],
    }));
  }

  function removeSymptom(index: number) {
    setIntake((previous) => ({
      ...previous,
      symptoms:
        previous.symptoms.length === 1
          ? previous.symptoms
          : previous.symptoms.filter((_, current) => current !== index),
    }));
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

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIntake((previous) => ({
          ...previous,
          demographics: {
            ...previous.demographics,
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          },
        }));
      },
      () => {
        setError(
          "Could not fetch your location. You can continue with manual input.",
        );
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  async function submitIntake() {
    setError("");
    setLoading(true);

    const payload: IntakePayload = {
      ...intake,
      symptoms: intake.symptoms.filter(
        (symptom) => symptom.name.trim().length > 0,
      ),
      history: {
        existingConditions: csvToList(existingConditions),
        medicationsTaken: csvToList(medications),
        allergies: csvToList(allergies),
      },
    };

    if (!payload.symptoms.length) {
      setError("Add at least one symptom before submitting.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to submit intake.");
      setLoading(false);
      return;
    }

    setTriage(data.triage);
    setConversationId(data.conversationId);
    setLoading(false);
  }

  async function runDemoMode() {
    setError("");
    setLoading(true);
    const response = await fetch("/api/demo-seed", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to create demo case.");
      setLoading(false);
      return;
    }

    setTriage(data.triage);
    setConversationId(data.conversationId);
    setLoading(false);
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
            onClick={runDemoMode}
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
                key={`${index}-${symptom.name}`}
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
