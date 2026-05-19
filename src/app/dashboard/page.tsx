import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { auth, signIn } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    await signIn("google", { redirectTo: "/dashboard" });
  }
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardClient />
    </main>
  );
}
