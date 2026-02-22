"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReferralPdfButton } from "@/components/referral-pdf-button";
import { TriageBadge } from "@/components/triage-badge";
import { ClockIcon, ReferralIcon, SpinnerIcon } from "@/components/ui-icons";
import type { ReferralNote } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface ReferralRow {
  id: string;
  conversationId: string;
  note: ReferralNote;
  createdAt: string;
}

export function ReferralsPanel() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [refRes, chatRes] = await Promise.all([
      fetch("/api/referrals"),
      fetch("/api/chat/history"),
    ]);

    const refData = await refRes.json();
    const chatData = await chatRes.json();

    if (!refRes.ok) {
      setError(refData.error ?? "Unable to load referrals.");
      setLoading(false);
      return;
    }

    const fetched = (refData.referrals ?? []) as ReferralRow[];
    setRows(fetched);
    setSelectedId(fetched[0]?.id ?? "");
    setConversationId(chatData.conversationId ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  async function generateReferral() {
    if (!conversationId) {
      setError("No conversation found. Complete intake and chat first.");
      return;
    }

    setGenerating(true);
    setError("");

    const response = await fetch("/api/referrals/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not generate referral note.");
      setGenerating(false);
      return;
    }

    const created: ReferralRow = {
      id: data.id,
      conversationId,
      note: data.note,
      createdAt: data.createdAt,
    };

    setRows((previous) => [created, ...previous]);
    setSelectedId(created.id);
    setGenerating(false);
  }

  return (
    <section className="space-y-4">
      <header className="card-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
              <ReferralIcon className="h-6 w-6 text-cyan-200" />
              Referral Notes
            </h1>
            <p className="mt-1 text-sm text-cyan-50/70">
              Generate doctor-ready notes from intake + chat context and export
              as PDF.
            </p>
          </div>
          <button
            type="button"
            disabled={generating}
            onClick={generateReferral}
            className="micro-lift inline-flex items-center gap-1.5 rounded-full bg-emerald-300 px-5 py-2 text-sm font-semibold text-slate-950 soft-focus-ring disabled:opacity-70"
          >
            {generating && <SpinnerIcon className="h-4 w-4" />}
            {generating ? "Generating..." : "Generate referral"}
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200/35 bg-red-950/35 p-3 text-sm text-red-100">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="card-glass rounded-3xl p-3">
          <h2 className="mb-2 px-2 text-sm font-semibold">Saved notes</h2>
          {loading ? (
            <p className="inline-flex items-center gap-1.5 px-2 text-sm text-cyan-50/70">
              <SpinnerIcon className="h-4 w-4" />
              Loading...
            </p>
          ) : rows.length === 0 ? (
            <p className="px-2 text-sm text-cyan-50/70">No referrals yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`micro-lift w-full rounded-2xl border p-3 text-left soft-focus-ring ${selectedId === row.id ? "border-cyan-200/50 bg-cyan-200/10" : "border-white/15 bg-slate-950/40"}`}
                >
                  <p className="inline-flex items-center gap-1 text-xs text-cyan-50/75">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {formatDateTime(row.createdAt)}
                  </p>
                  <p className="mt-1 text-sm">{row.note.recommendedUrgency}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="card-glass rounded-3xl p-6">
          {!selected ? (
            <p className="text-sm text-cyan-50/75">Select a referral note.</p>
          ) : (
            <article className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="inline-flex items-center gap-1.5 text-xl font-semibold">
                    <ReferralIcon className="h-5 w-5 text-cyan-200" />
                    Referral Note
                  </h2>
                  <p className="inline-flex items-center gap-1 text-xs text-cyan-50/70">
                    <ClockIcon className="h-3.5 w-3.5" />
                    Generated {formatDateTime(selected.note.generatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TriageBadge level={selected.note.triageLevel} />
                  <ReferralPdfButton
                    note={selected.note}
                    filename={`maxwell-referral-${selected.id}.pdf`}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="micro-lift rounded-xl border border-white/15 bg-slate-950/40 p-3 text-sm">
                  <p>
                    <strong>Age:</strong>{" "}
                    {selected.note.patientBasics.age ?? "Unknown"}
                  </p>
                  <p>
                    <strong>Sex at birth:</strong>{" "}
                    {selected.note.patientBasics.sexAtBirth}
                  </p>
                  <p>
                    <strong>Location:</strong>{" "}
                    {selected.note.patientBasics.location}
                  </p>
                </div>
                <div className="micro-lift rounded-xl border border-white/15 bg-slate-950/40 p-3 text-sm">
                  <p>
                    <strong>Urgency:</strong> {selected.note.recommendedUrgency}
                  </p>
                  <p>
                    <strong>Conversation:</strong>{" "}
                    {selected.note.conversationId}
                  </p>
                </div>
              </div>

              <section className="micro-lift rounded-xl border border-white/15 bg-slate-950/40 p-3 text-sm">
                <h3 className="mb-1 text-sm font-semibold">
                  Symptoms timeline
                </h3>
                <p className="text-cyan-50/85">
                  {selected.note.symptomsTimeline}
                </p>
              </section>

              <section className="micro-lift rounded-xl border border-white/15 bg-slate-950/40 p-3 text-sm">
                <h3 className="mb-2 text-sm font-semibold">
                  Suspected conditions
                </h3>
                <ul className="space-y-2 text-cyan-50/85">
                  {selected.note.suspectedConditions.map((condition) => (
                    <li key={`${condition.condition}-${condition.rationale}`}>
                      {condition.condition} ({condition.likelihood}) -{" "}
                      {condition.rationale}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="micro-lift rounded-xl border border-white/15 bg-slate-950/40 p-3 text-sm">
                <h3 className="mb-2 text-sm font-semibold">
                  Doctor handoff summary
                </h3>
                <p className="whitespace-pre-wrap text-cyan-50/85">
                  {selected.note.doctorHandoffSummary}
                </p>
              </section>
            </article>
          )}
        </main>
      </div>
    </section>
  );
}
