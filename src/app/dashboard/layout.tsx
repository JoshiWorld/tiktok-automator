import type { ReactNode } from "react";

import { ActiveTikTokAccountProvider } from "@/components/dashboard/active-tiktok-account";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ActiveTikTokAccountProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <DashboardShell />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </ActiveTikTokAccountProvider>
  );
}
