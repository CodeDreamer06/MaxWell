import { auth } from "@clerk/nextjs/server";
import {
  addChatMessage,
  saveIntakeAndConversation,
  saveMemorySnapshot,
} from "@/lib/db";
import { IntakeSchema } from "@/lib/schemas";
import { buildMemoryFromIntake, generateTriage } from "@/lib/services/triage";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid intake payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const triage = await generateTriage(parsed.data);
    const record = await saveIntakeAndConversation({
      clerkUserId: userId,
      intake: parsed.data,
      triage,
    });

    await saveMemorySnapshot({
      clerkUserId: userId,
      snapshot: buildMemoryFromIntake(parsed.data, triage),
      sourceMessageIds: [],
    });

    await addChatMessage({
      conversationId: record.conversationId,
      role: "assistant",
      content: [
        `Triage Result: ${triage.triageLevel.toUpperCase()}`,
        triage.whyThisTriage,
        "",
        "What you can do now:",
        ...triage.whatToDoNow.map((step) => `- ${step}`),
      ].join("\n"),
      metadata: { source: "intake-triage" },
    });

    return Response.json({
      conversationId: record.conversationId,
      intakeId: record.intakeId,
      triage,
    });
  } catch {
    return Response.json(
      {
        error:
          "Unable to save intake at the moment. Confirm Postgres env vars and retry.",
      },
      { status: 500 },
    );
  }
}
