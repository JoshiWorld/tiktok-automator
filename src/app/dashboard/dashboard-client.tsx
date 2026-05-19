"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export function DashboardClient() {
  const accounts = api.tiktokAccount.list.useQuery();

  const firstAccountId = accounts.data?.[0]?.id;
  const rules = api.workflowRule.listByAccount.useQuery(
    { tiktokAccountId: firstAccountId! },
    { enabled: !!firstAccountId },
  );
  const videos = api.monitoredVideo.listByAccount.useQuery(
    { tiktokAccountId: firstAccountId! },
    { enabled: !!firstAccountId },
  );
  const sessions = api.automationSession.listByAccount.useQuery(
    { tiktokAccountId: firstAccountId! },
    { enabled: !!firstAccountId },
  );

  if (accounts.isLoading) {
    return <p className="text-muted-foreground">Lade Konten…</p>;
  }

  if (accounts.error) {
    return (
      <p className="text-destructive">
        Fehler: {accounts.error.message} — evtl. fehlende Berechtigung oder nicht
        angemeldet.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">TikTok Automator</h1>
        <Button variant="outline" asChild>
          <Link href="/">Zur Startseite</Link>
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-medium">TikTok-Konten</h2>
        {accounts.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Noch kein Konto verbunden. Nutze die tRPC-Mutation{" "}
            <code className="rounded bg-muted px-1">tiktokAccount.connect</code> (oder
            baue ein OAuth-UI).
          </p>
        ) : (
          <ul className="list-inside list-disc text-sm">
            {accounts.data?.map((a) => (
              <li key={a.id}>
                {a.displayName ?? a.handle ?? a.openId}{" "}
                <span className="text-muted-foreground">({a.id})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {firstAccountId ? (
        <>
          <section>
            <h2 className="mb-2 text-lg font-medium">Überwachte Videos</h2>
            {videos.isLoading ? (
              <p className="text-muted-foreground text-sm">Lade…</p>
            ) : (
              <ul className="text-sm">
                {(videos.data ?? []).map((v) => (
                  <li key={v.id}>
                    {v.videoId}
                    {v.title ? ` — ${v.title}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium">Workflow-Regeln</h2>
            {rules.isLoading ? (
              <p className="text-muted-foreground text-sm">Lade…</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {(rules.data ?? []).map((r) => (
                  <li key={r.id} className="rounded-md border p-3">
                    <div className="font-medium">
                      {r.triggerType} · Priorität {r.priority}{" "}
                      {!r.enabled ? (
                        <span className="text-muted-foreground">(deaktiviert)</span>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground">
                      Trigger: {r.triggerTerms.map((t) => t.normalizedTerm).join(", ")}
                    </div>
                    <div>
                      Aktionen:{" "}
                      {(r.workflow?.actions ?? [])
                        .map((a) => `${a.type}@${a.order}`)
                        .join(", ") || "—"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium">Automation-Sessions</h2>
            {sessions.isLoading ? (
              <p className="text-muted-foreground text-sm">Lade…</p>
            ) : (
              <ul className="text-sm">
                {(sessions.data ?? []).map((s) => (
                  <li key={s.id}>
                    {s.state} · Schritt {s.currentStepIndex} · Teilnehmer{" "}
                    {s.participantOpenId}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
