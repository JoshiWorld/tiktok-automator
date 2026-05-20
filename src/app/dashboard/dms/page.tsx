import { auth, signIn } from "@/server/auth";

import { DmsDashboardClient } from "@/app/dashboard/dms/dms-dashboard-client";

export default async function DmsPage() {
  const session = await auth();
  if (!session?.user) {
    await signIn("google", { redirectTo: "/dashboard/dms" });
  }

  return (
    <main className="bg-background text-foreground flex min-h-0 flex-1 flex-col">
      <DmsDashboardClient />
    </main>
  );
}
