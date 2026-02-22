import { auth } from "@clerk/nextjs/server";
import { setMessageImportant } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { important?: boolean };

  const success = await setMessageImportant({
    clerkUserId: userId,
    messageId: id,
    important: Boolean(body.important),
  });

  return Response.json({ ok: success });
}
