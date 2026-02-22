import { auth } from "@clerk/nextjs/server";
import { listReferralNotes } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const referrals = await listReferralNotes(userId);
  return Response.json({ referrals });
}
