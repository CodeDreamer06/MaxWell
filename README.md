# MaxWell - AI Rural Healthcare Assistant

MaxWell is a triage-first AI healthcare assistant designed for rural and low-resource settings. The product is optimized for one critical promise: **help users decide what to do next safely and quickly**.

This repository contains a Next.js + Tailwind implementation focused on a polished, demo-ready vertical slice:

- Structured intake -> triage decision
- Context-aware clinical chat
- Hospital discovery via map + nearest list
- Memory snapshot per user
- Referral note generation + PDF export

## 0) Current Build Status (Session Snapshot)

Last updated: **February 22, 2026**

Implemented and working in code:
- Clerk-protected routes with app shell
- Intake wizard with triage result and emergency CTA
- Streaming chat with copy/regenerate/important actions
- Attachments support (image + PDF text extraction)
- Memory snapshot persistence and settings editor
- Hospitals map/list via Mapbox API
- Referral note generation, history, and PDF export
- Demo-mode seed flow
- Local pre-coded demo intake loader (no demo API dependency in intake UI)
- Auto geolocation attempt on intake/hospitals pages with manual fallback
- Intake payload normalization + client/server debug logging for validation failures
- SQL migration file + runtime schema guard

Validation status:
- `npm run lint` passes
- `npm run build` passes

## 1) Vision and Problem Statement

### Why MaxWell
Rural users often face delayed care due to distance, cost, and uncertainty about symptom severity. Generic AI chat can feel "diagnostic" but does not reliably prioritize urgency or practical next actions.

### Product principle
MaxWell is **triage-first**, not diagnosis-first.

- First classify urgency (`red`, `orange`, `yellow`, `green`)
- Then provide clear, local, actionable guidance
- Then support follow-up via chat, hospitals, and referral notes

### Intended impact
- Reduce delay for emergencies
- Improve quality of history presented to clinicians
- Give users structured, calm guidance in plain language

## 2) Core Features

### MVP (current build target)
- Clerk auth (protected app routes)
- Structured intake wizard with red-flag checks
- LLM-backed triage with safety guardrails
- Chat page with preloaded context from intake
- Persistent triage badge in chat
- Memory snapshot stored per user in Postgres
- Hospitals lookup + map pins using Mapbox
- Referral note generation + list/history
- Referral PDF export

### Nice-to-haves (next)
- Better multilingual support
- Voice input/output for low literacy users
- Follow-up reminders and care-plan nudges
- Provider handoff mode (nurse/ANM dashboard)
- Offline-first cached flow

## 3) Product Flow (Screens + Journey)

### Primary journey
1. **Landing (`/`)**
   - Value proposition + sign-in/up
2. **Intake (`/intake`)**
   - Multi-step structured symptom intake
   - Demographics, symptoms, progression, red flags, meds/allergies, optional vitals, location
3. **Triage result**
   - Urgency color + why + immediate actions
   - Emergency CTA when needed
4. **Chat (`/chat`)**
   - Context-aware assistant with triage badge
   - Suggested next question chips
   - Attachment support (images/PDF text extraction)
5. **Hospitals (`/hospitals`)**
   - Nearest facilities list + map + quick actions
6. **Referrals (`/referrals`)**
   - Generate referral note, save history, export PDF
7. **Settings (`/settings`)**
   - Review/edit patient memory snapshot

## 4) Architecture

### Frontend
- Next.js App Router + TypeScript
- Tailwind CSS v4 custom theme
- Reusable UI components for cards, chips, badges, stepper, CTA blocks

### Auth
- Clerk for sign-in/up and protected routes
- Middleware-based route protection

### API layer
- Next.js Route Handlers under `app/api/*`
- JSON-first contracts with shared TypeScript/Zod schemas

### Data layer
- Vercel Postgres (`@vercel/postgres`) SQL queries
- SQL migrations in `db/migrations`
- Versioned memory snapshots and saved referral notes

### LLM gateway
- Wrapper in `lib/llm/client.ts`
- Configurable through env:
  - `OPENAI_BASE_URL`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- Structured JSON outputs validated with Zod

### Maps
- Mapbox APIs for geocoding + nearby hospital search
- Mapbox GL JS for interactive map visualization

## 5) Data Model

Planned relational model (implemented in migration SQL):

### `user_profiles`
- `id` (uuid pk)
- `clerk_user_id` (unique)
- `name`, `email`, timestamps

### `conversations`
- `id` (uuid pk)
- `clerk_user_id`
- `title`
- `triage_level`
- `intake_id` (fk)
- timestamps

### `intake_submissions`
- `id` (uuid pk)
- `clerk_user_id`
- `payload_json` (full intake data)
- `triage_json` (model output)
- `created_at`

### `chat_messages`
- `id` (uuid pk)
- `conversation_id` (fk)
- `role` (`user`/`assistant`/`system`)
- `content`
- `metadata_json`
- `is_important` (boolean)
- `created_at`

### `memory_snapshots`
- `id` (uuid pk)
- `clerk_user_id`
- `version` (int)
- `snapshot_json`
- `source_message_ids` (jsonb array)
- `created_at`

### `referral_notes`
- `id` (uuid pk)
- `clerk_user_id`
- `conversation_id` (fk)
- `note_json`
- `created_at`

## 6) Prompting Strategy + Safety Guardrails

### System behavior goals
- Never claim diagnosis certainty
- Use probabilistic language
- Prioritize triage and immediate safety
- Ask critical follow-ups when information is incomplete

### Triage output contract
Structured JSON fields:
- `triageLevel` (`red|orange|yellow|green`)
- `confidence`
- `possibleConditions[]` with rationale
- `whyThisTriage`
- `whatToDoNow[]`
- `whenToSeekHelp[]`
- `whatToTellDoctor[]`
- `followUpQuestions[]`
- `emergencySignalsDetected[]`

### Emergency escalation behavior
If red flags or severe symptoms are detected, the assistant must:
- Clearly advise emergency services now
- Show ambulance CTA + local emergency reminder
- Avoid delay-inducing wording

### Disclaimers
Display concise medical disclaimer persistently in chat/intake results:
- "MaxWell is not a doctor. In emergencies call local emergency services immediately."

## 7) Memory System Design

### Goals
- Keep context compact and useful
- Reduce hallucinated personalization
- Let users review/edit what is remembered

### Strategy
- Store complete raw intake/chat events
- Maintain canonical per-user snapshot with versioning
- Compress periodically into:
  - demographics
  - chronic conditions
  - allergies
  - medications
  - important prior events
  - current episode summary (timeline + triage + red flags)

### Safety controls
- Memory is viewable/editable in settings
- Snapshot updates track source message IDs
- Do not infer persistent facts unless user explicitly stated

## 8) Implementation Plan and Milestones

### Milestone A: Foundations
- Clerk integration + protected routes
- Theme/UI shell
- DB migration + query layer

### Milestone B: Intake + triage
- Wizard UI
- Triage API with Zod schema validation
- Intake persistence + initial memory snapshot

### Milestone C: Chat + memory reuse
- Chat streaming
- Suggested next questions
- Attachment parsing (images/PDF)
- Memory-aware prompt context

### Milestone D: Hospitals + referrals
- Mapbox hospital search + map pins
- Referral note generation and storage
- PDF export

### Milestone E: polish + validation
- Demo mode seed
- QA + edge-case handling
- Docs complete

## 9) Progress Tracker (Live)

> Update this checklist every working session so future contributors can resume quickly.

### Product
- [x] Landing page brand + conversion UX
- [x] Protected navigation shell
- [x] Intake wizard (multi-step interactive cards)
- [x] Triage result page/section with urgency CTA
- [x] Chat interface with streaming + actions
- [x] Suggested question chips
- [x] Attachments (image/PDF)
- [x] Hospitals map + nearest list + actions
- [x] Referral notes list/view/export
- [x] Settings memory review/edit

### Backend
- [x] DB migration SQL committed
- [x] Intake save API
- [x] Triage API with Zod validation
- [x] Chat API with streaming
- [x] Memory snapshot create/update API
- [x] Hospitals API (Mapbox)
- [x] Referrals generate/list API

### Platform
- [x] Clerk fully wired (middleware + provider + routes)
- [x] Env validation and graceful failure UI
- [ ] Vercel deployment config verified
- [x] Basic lint/build checks passing

### Demo readiness
- [x] Seed/demo patient scenario
- [x] Emergency flow clearly demonstrated
- [x] Known limitations documented

## 10) Setup Guide

## Prerequisites
- Node.js 20+
- npm
- Clerk account
- Mapbox account
- Vercel project with Postgres integration

## Environment variables
Create `.env.local`:

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini

MAPBOX_ACCESS_TOKEN=...
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=... # for map rendering in browser

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

POSTGRES_URL=...
POSTGRES_PRISMA_URL=...
POSTGRES_URL_NON_POOLING=...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
```

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Clerk setup notes
- Enable Email (or preferred auth) in Clerk dashboard
- Set allowed redirect URLs for local + production
- Ensure middleware protects all private routes

## Mapbox setup notes
- Use token with geocoding + styles permissions
- Restrict token usage to your domain in production

## Database migration steps
SQL files are in `db/migrations`.

Option A: Vercel SQL console
- Open your Vercel Postgres SQL console
- Run migration SQL in order

Option B: psql

```bash
psql "$POSTGRES_URL" -f db/migrations/0001_init.sql
```

## Deploy to Vercel
- Import Git repo into Vercel
- Set all env vars in Vercel project settings
- Deploy; ensure Clerk and Mapbox callback origins include deployed domain
- Run migration SQL (`db/migrations/0001_init.sql`) against production Postgres before first demo

## 11) Testing Notes

### Manual test matrix (minimum)
- Intake with emergency red flags -> red triage + emergency CTA
- Intake low-severity symptoms -> yellow/green guidance
- Chat follows context from intake without re-asking basics
- Memory panel reflects known facts and supports edits
- Hospitals results render list + map pins
- Referral note generation and PDF export work

### Suggested automated tests (next)
- Zod schema validation tests for triage/referral JSON parsing
- API contract tests for `app/api/*`
- Component tests for stepper and triage rendering states

### Commands run in this session
- `npm run lint` (pass)
- `npm run build` (pass)

## 12) Known Limitations (Current)

- LLM outputs can vary; strict schema validation + fallback messaging is required.
- Hospital contact/hours availability depends on Mapbox data quality in region.
- Not a medical device; guidance is informational and escalation-first.
- Attachment parsing quality depends on input quality (photo clarity, PDF structure).
- Referral PDF export currently uses text layout (no branded template yet).
- Middleware works, but Next.js 16 warns that `middleware.ts` is deprecated in favor of `proxy.ts` (migration pending).
- Build can run without Clerk env keys only due a local fallback publishable key; real deployments must set valid Clerk keys.

## 13) Compliance and Safety Reminder

MaxWell is not a replacement for licensed clinicians. It should be used for triage assistance, education, and care navigation only. In emergencies, users must contact local emergency services immediately.

---

## Handoff Notes for Next Contributor

When resuming work:
1. Read this README start to finish.
2. Check progress tracker and update statuses before and after your session.
3. Prioritize completion of current milestone before adding new scope.
4. Keep all medical behavior triage-first and safety-forward.
