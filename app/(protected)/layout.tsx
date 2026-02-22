import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { upsertUserProfile } from "@/lib/db";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const user = await currentUser();
    await upsertUserProfile({
      clerkUserId: userId,
      name: user?.fullName,
      email: user?.emailAddresses[0]?.emailAddress,
    });
  } catch {
    // Keep the UI usable even if DB is not configured yet.
  }

  return <AppShell>{children}</AppShell>;
}
