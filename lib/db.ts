import "server-only";

import { sql } from "@vercel/postgres";
import type {
  ChatMessageRecord,
  IntakePayload,
  MemorySnapshot,
  ReferralNote,
  TriageResult,
} from "@/lib/types";

let schemaPromise: Promise<void> | null = null;

function safeJson<T>(value: unknown, fallback: T): T {
  if (!value) {
    return fallback;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

      await sql`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clerk_user_id TEXT UNIQUE NOT NULL,
          name TEXT,
          email TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS intake_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clerk_user_id TEXT NOT NULL,
          payload_json JSONB NOT NULL,
          triage_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clerk_user_id TEXT NOT NULL,
          title TEXT,
          triage_level TEXT NOT NULL,
          intake_id UUID REFERENCES intake_submissions(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          is_important BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS memory_snapshots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clerk_user_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          snapshot_json JSONB NOT NULL,
          source_message_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS referral_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clerk_user_id TEXT NOT NULL,
          conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
          note_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_conversations_user_created
        ON conversations (clerk_user_id, created_at DESC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
        ON chat_messages (conversation_id, created_at)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_memory_user_version
        ON memory_snapshots (clerk_user_id, version DESC)
      `;
    })();
  }
  await schemaPromise;
}

export async function upsertUserProfile(params: {
  clerkUserId: string;
  name?: string | null;
  email?: string | null;
}) {
  await ensureSchema();

  await sql`
    INSERT INTO user_profiles (clerk_user_id, name, email)
    VALUES (${params.clerkUserId}, ${params.name ?? null}, ${params.email ?? null})
    ON CONFLICT (clerk_user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      updated_at = NOW()
  `;
}

export async function saveIntakeAndConversation(params: {
  clerkUserId: string;
  intake: IntakePayload;
  triage: TriageResult;
}) {
  await ensureSchema();

  const intake = await sql<{ id: string }>`
    INSERT INTO intake_submissions (clerk_user_id, payload_json, triage_json)
    VALUES (
      ${params.clerkUserId},
      ${JSON.stringify(params.intake)}::jsonb,
      ${JSON.stringify(params.triage)}::jsonb
    )
    RETURNING id
  `;

  const conversation = await sql<{ id: string }>`
    INSERT INTO conversations (clerk_user_id, title, triage_level, intake_id)
    VALUES (
      ${params.clerkUserId},
      ${`Intake ${new Date().toLocaleDateString()}`},
      ${params.triage.triageLevel},
      ${intake.rows[0].id}
    )
    RETURNING id
  `;

  return {
    intakeId: intake.rows[0].id,
    conversationId: conversation.rows[0].id,
  };
}

export async function getConversationContext(params: {
  clerkUserId: string;
  conversationId: string;
}) {
  await ensureSchema();

  const result = await sql<{
    id: string;
    title: string | null;
    triage_level: string;
    intake_payload: unknown;
    intake_triage: unknown;
  }>`
    SELECT
      c.id,
      c.title,
      c.triage_level,
      i.payload_json AS intake_payload,
      i.triage_json AS intake_triage
    FROM conversations c
    LEFT JOIN intake_submissions i ON i.id = c.intake_id
    WHERE c.id = ${params.conversationId}
      AND c.clerk_user_id = ${params.clerkUserId}
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    triageLevel: row.triage_level,
    intakePayload: safeJson<IntakePayload | null>(row.intake_payload, null),
    intakeTriage: safeJson<TriageResult | null>(row.intake_triage, null),
  };
}

export async function getLatestConversation(clerkUserId: string) {
  await ensureSchema();

  const result = await sql<{
    id: string;
    triage_level: string;
    title: string | null;
    created_at: string;
  }>`
    SELECT id, triage_level, title, created_at
    FROM conversations
    WHERE clerk_user_id = ${clerkUserId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return result.rows[0] ?? null;
}

export async function getConversationMessages(params: {
  clerkUserId: string;
  conversationId: string;
  limit?: number;
}) {
  await ensureSchema();

  const messages = await sql<{
    id: string;
    conversation_id: string;
    role: "system" | "user" | "assistant";
    content: string;
    is_important: boolean;
    created_at: string;
  }>`
    SELECT m.id, m.conversation_id, m.role, m.content, m.is_important, m.created_at
    FROM chat_messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    WHERE m.conversation_id = ${params.conversationId}
      AND c.clerk_user_id = ${params.clerkUserId}
    ORDER BY m.created_at ASC
    LIMIT ${params.limit ?? 80}
  `;

  return messages.rows.map<ChatMessageRecord>((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    isImportant: row.is_important,
    createdAt: row.created_at,
  }));
}

export async function addChatMessage(params: {
  conversationId: string;
  role: "system" | "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
}) {
  await ensureSchema();

  const result = await sql<{ id: string }>`
    INSERT INTO chat_messages (conversation_id, role, content, metadata_json)
    VALUES (
      ${params.conversationId},
      ${params.role},
      ${params.content},
      ${JSON.stringify(params.metadata ?? {})}::jsonb
    )
    RETURNING id
  `;

  await sql`
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = ${params.conversationId}
  `;

  return result.rows[0].id;
}

export async function setMessageImportant(params: {
  clerkUserId: string;
  messageId: string;
  important: boolean;
}) {
  await ensureSchema();

  const result = await sql`
    UPDATE chat_messages m
    SET is_important = ${params.important}
    FROM conversations c
    WHERE m.id = ${params.messageId}
      AND c.id = m.conversation_id
      AND c.clerk_user_id = ${params.clerkUserId}
  `;

  return (result.rowCount ?? 0) > 0;
}

export async function getLatestMemorySnapshot(clerkUserId: string) {
  await ensureSchema();

  const result = await sql<{
    id: string;
    version: number;
    snapshot_json: unknown;
    created_at: string;
  }>`
    SELECT id, version, snapshot_json, created_at
    FROM memory_snapshots
    WHERE clerk_user_id = ${clerkUserId}
    ORDER BY version DESC
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    version: row.version,
    createdAt: row.created_at,
    snapshot: safeJson<MemorySnapshot>(row.snapshot_json, {
      demographics: {
        age: null,
        sexAtBirth: "prefer_not_to_say",
        pregnancyPossible: null,
        locationText: "",
      },
      chronicConditions: [],
      allergies: [],
      medications: [],
      importantEvents: [],
      currentEpisode: {
        symptomsTimeline: "",
        redFlags: [],
        triageLevel: "green",
        summary: "",
      },
      lastUpdated: new Date().toISOString(),
    }),
  };
}

export async function saveMemorySnapshot(params: {
  clerkUserId: string;
  snapshot: MemorySnapshot;
  sourceMessageIds?: string[];
}) {
  await ensureSchema();

  const previous = await getLatestMemorySnapshot(params.clerkUserId);
  const nextVersion = (previous?.version ?? 0) + 1;

  await sql`
    INSERT INTO memory_snapshots (
      clerk_user_id,
      version,
      snapshot_json,
      source_message_ids
    )
    VALUES (
      ${params.clerkUserId},
      ${nextVersion},
      ${JSON.stringify(params.snapshot)}::jsonb,
      ${JSON.stringify(params.sourceMessageIds ?? [])}::jsonb
    )
  `;

  return nextVersion;
}

export async function updateMemorySnapshot(params: {
  clerkUserId: string;
  patch: {
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
    importantEvents?: string[];
    locationText?: string;
  };
}) {
  await ensureSchema();

  const latest = await getLatestMemorySnapshot(params.clerkUserId);
  if (!latest) {
    return null;
  }

  const next: MemorySnapshot = {
    ...latest.snapshot,
    chronicConditions:
      params.patch.chronicConditions ?? latest.snapshot.chronicConditions,
    allergies: params.patch.allergies ?? latest.snapshot.allergies,
    medications: params.patch.medications ?? latest.snapshot.medications,
    importantEvents:
      params.patch.importantEvents ?? latest.snapshot.importantEvents,
    demographics: {
      ...latest.snapshot.demographics,
      locationText:
        params.patch.locationText ?? latest.snapshot.demographics.locationText,
    },
    lastUpdated: new Date().toISOString(),
  };

  await saveMemorySnapshot({
    clerkUserId: params.clerkUserId,
    snapshot: next,
    sourceMessageIds: [],
  });

  return next;
}

export async function saveReferralNote(params: {
  clerkUserId: string;
  conversationId: string;
  note: ReferralNote;
}) {
  await ensureSchema();

  const result = await sql<{ id: string; created_at: string }>`
    INSERT INTO referral_notes (clerk_user_id, conversation_id, note_json)
    VALUES (
      ${params.clerkUserId},
      ${params.conversationId},
      ${JSON.stringify(params.note)}::jsonb
    )
    RETURNING id, created_at
  `;

  return result.rows[0];
}

export async function listReferralNotes(clerkUserId: string) {
  await ensureSchema();

  const result = await sql<{
    id: string;
    conversation_id: string;
    note_json: unknown;
    created_at: string;
  }>`
    SELECT id, conversation_id, note_json, created_at
    FROM referral_notes
    WHERE clerk_user_id = ${clerkUserId}
    ORDER BY created_at DESC
    LIMIT 60
  `;

  return result.rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    note: safeJson<ReferralNote>(row.note_json, {
      patientBasics: {
        age: null,
        sexAtBirth: "prefer_not_to_say",
        location: "",
      },
      symptomsTimeline: "",
      redFlagsChecked: [],
      vitalsReported: {
        temperatureC: null,
        pulseBpm: null,
        spo2: null,
        bpSystolic: null,
        bpDiastolic: null,
      },
      suspectedConditions: [],
      suggestedTests: [],
      medicationsTaken: [],
      allergies: [],
      triageLevel: "green",
      recommendedUrgency: "",
      doctorHandoffSummary: "",
      generatedAt: new Date().toISOString(),
      conversationId: row.conversation_id,
    }),
    createdAt: row.created_at,
  }));
}
