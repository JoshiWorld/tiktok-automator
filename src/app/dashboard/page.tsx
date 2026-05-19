import { redirect } from "next/navigation";

import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { auth } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardClient />
    </main>
  );
}
