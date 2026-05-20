import { redirect } from "next/navigation";
import { Suspense } from "react";

import { TikTokConnectPanel } from "@/app/dashboard/tiktok/tiktok-connect-panel";
import { auth } from "@/server/auth";

export default async function TikTokDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/dashboard/tiktok");

  return (
    <main className="bg-background text-foreground">
      <Suspense fallback={<p className="text-muted-foreground p-6">Laden…</p>}>
        <TikTokConnectPanel />
      </Suspense>
    </main>
  );
}
