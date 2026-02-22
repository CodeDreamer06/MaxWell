"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemorySnapshot } from "@/lib/types";

function listToCsv(values: string[]) {
  return values.join(", ");
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function SettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [memory, setMemory] = useState<MemorySnapshot | null>(null);

  const [conditions, setConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [events, setEvents] = useState("");
  const [location, setLocation] = useState("");

  const loadMemory = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/memory");
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Unable to load memory snapshot.");
      setLoading(false);
      return;
    }

    if (data.memory) {
      const snapshot = data.memory as MemorySnapshot;
      setMemory(snapshot);
      setConditions(listToCsv(snapshot.chronicConditions));
      setAllergies(listToCsv(snapshot.allergies));
      setMedications(listToCsv(snapshot.medications));
      setEvents(listToCsv(snapshot.importantEvents));
      setLocation(snapshot.demographics.locationText);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMemory();
  }, [loadMemory]);

  async function saveChanges() {
    setSaving(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/memory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chronicConditions: csvToList(conditions),
        allergies: csvToList(allergies),
        medications: csvToList(medications),
        importantEvents: csvToList(events),
        locationText: location,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not save memory updates.");
      setSaving(false);
      return;
    }

    setMemory(data.memory as MemorySnapshot);
    setSuccess("Memory snapshot updated.");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-cyan-50/75">Loading memory...</p>;
  }

  return (
    <section className="space-y-4">
      <header className="card-glass rounded-3xl p-6">
        <h1 className="text-2xl font-semibold">Settings & Memory Review</h1>
        <p className="mt-2 text-sm text-cyan-50/70">
          Review what MaxWell remembers and correct any details. This helps
          avoid incorrect context.
        </p>
      </header>

      <div className="card-glass rounded-3xl p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Location
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/55 px-3 py-2"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            Chronic conditions (comma separated)
            <input
              value={conditions}
              onChange={(event) => setConditions(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/55 px-3 py-2"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            Allergies
            <input
              value={allergies}
              onChange={(event) => setAllergies(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/55 px-3 py-2"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            Current medications
            <input
              value={medications}
              onChange={(event) => setMedications(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/55 px-3 py-2"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            Important events
            <textarea
              rows={4}
              value={events}
              onChange={(event) => setEvents(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/55 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save memory"}
          </button>
        </div>

        {success && <p className="mt-3 text-sm text-emerald-200">{success}</p>}
        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </div>

      {memory && (
        <article className="card-glass rounded-3xl p-6 text-sm text-cyan-50/85">
          <h2 className="mb-2 text-lg font-semibold">
            Current memory snapshot
          </h2>
          <p>
            <strong>Last updated:</strong>{" "}
            {new Date(memory.lastUpdated).toLocaleString()}
          </p>
          <p>
            <strong>Current episode summary:</strong>{" "}
            {memory.currentEpisode.summary}
          </p>
          <p>
            <strong>Triage:</strong>{" "}
            {memory.currentEpisode.triageLevel.toUpperCase()}
          </p>
        </article>
      )}
    </section>
  );
}
