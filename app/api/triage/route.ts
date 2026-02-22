import { auth } from "@clerk/nextjs/server";
import { IntakeSchema } from "@/lib/schemas";
import { generateTriage } from "@/lib/services/triage";

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

  const triage = await generateTriage(parsed.data);
  return Response.json({ triage });
}
