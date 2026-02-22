import { auth } from "@clerk/nextjs/server";
import { DEMO_INTAKE_TEMPLATE } from "@/lib/constants";
import {
  addChatMessage,
  saveIntakeAndConversation,
  saveMemorySnapshot,
} from "@/lib/db";
import { buildMemoryFromIntake, generateTriage } from "@/lib/services/triage";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triage = await generateTriage(DEMO_INTAKE_TEMPLATE);
  const created = await saveIntakeAndConversation({
    clerkUserId: userId,
    intake: DEMO_INTAKE_TEMPLATE,
    triage,
  });

  await saveMemorySnapshot({
    clerkUserId: userId,
    snapshot: buildMemoryFromIntake(DEMO_INTAKE_TEMPLATE, triage),
    sourceMessageIds: [],
  });

  await addChatMessage({
    conversationId: created.conversationId,
    role: "assistant",
    content:
      "Demo case loaded. Ask follow-up questions to continue care guidance.",
    metadata: { source: "demo-seed" },
  });

  return Response.json({
    conversationId: created.conversationId,
    triage,
    demo: true,
  });
}
