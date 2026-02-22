import { auth } from "@clerk/nextjs/server";
import {
  getConversationContext,
  getConversationMessages,
  saveReferralNote,
} from "@/lib/db";
import { generateReferralNote } from "@/lib/services/referral";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { conversationId?: string };
  if (!body.conversationId) {
    return Response.json(
      { error: "conversationId is required" },
      { status: 400 },
    );
  }

  const context = await getConversationContext({
    clerkUserId: userId,
    conversationId: body.conversationId,
  });
  if (!context) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = await getConversationMessages({
    clerkUserId: userId,
    conversationId: body.conversationId,
  });

  const note = await generateReferralNote({
    conversationId: body.conversationId,
    intake: context.intakePayload,
    triage: context.intakeTriage,
    messages,
  });

  const saved = await saveReferralNote({
    clerkUserId: userId,
    conversationId: body.conversationId,
    note,
  });

  return Response.json({ id: saved.id, createdAt: saved.created_at, note });
}
