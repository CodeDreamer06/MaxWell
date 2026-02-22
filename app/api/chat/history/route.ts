import { auth } from "@clerk/nextjs/server";
import {
  getConversationContext,
  getConversationMessages,
  getLatestConversation,
} from "@/lib/db";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  const latest = conversationId
    ? { id: conversationId }
    : await getLatestConversation(userId);

  if (!latest) {
    return Response.json({ needsIntake: true, messages: [] });
  }

  const context = await getConversationContext({
    clerkUserId: userId,
    conversationId: latest.id,
  });

  if (!context) {
    return Response.json({ needsIntake: true, messages: [] });
  }

  const messages = await getConversationMessages({
    clerkUserId: userId,
    conversationId: latest.id,
  });

  return Response.json({
    conversationId: latest.id,
    triageLevel: context.triageLevel,
    triage: context.intakeTriage,
    messages,
  });
}
