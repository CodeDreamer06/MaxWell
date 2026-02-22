import { auth } from "@clerk/nextjs/server";
import {
  getLatestMemorySnapshot,
  saveMemorySnapshot,
  updateMemorySnapshot,
} from "@/lib/db";
import { MemoryPatchSchema } from "@/lib/schemas";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memory = await getLatestMemorySnapshot(userId);
  return Response.json({
    memory: memory?.snapshot ?? null,
    version: memory?.version,
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = MemoryPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Invalid memory patch" }, { status: 400 });
  }

  const updated = await updateMemorySnapshot({
    clerkUserId: userId,
    patch: parsed.data,
  });

  if (updated) {
    return Response.json({ memory: updated });
  }

  const fallback = {
    demographics: {
      age: null,
      sexAtBirth: "prefer_not_to_say" as const,
      pregnancyPossible: null,
      locationText: parsed.data.locationText ?? "",
    },
    chronicConditions: parsed.data.chronicConditions ?? [],
    allergies: parsed.data.allergies ?? [],
    medications: parsed.data.medications ?? [],
    importantEvents: parsed.data.importantEvents ?? [],
    currentEpisode: {
      symptomsTimeline: "",
      redFlags: [],
      triageLevel: "green" as const,
      summary: "",
    },
    lastUpdated: new Date().toISOString(),
  };

  await saveMemorySnapshot({
    clerkUserId: userId,
    snapshot: fallback,
    sourceMessageIds: [],
  });

  return Response.json({ memory: fallback });
}
