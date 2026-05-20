"use client";

import Link from "next/link";

import { useSelectedTikTokAccount } from "@/components/dashboard/active-tiktok-account";
import { api } from "@/trpc/react";

export function DashboardClient() {
  const { allAccounts, selectedId, isLoading, error, hydrated } =
    useSelectedTikTokAccount();

  const rules = api.workflowRule.listByAccount.useQuery(
    { tiktokAccountId: selectedId! },
    { enabled: !!selectedId },
  );
  const videos = api.monitoredVideo.listByAccount.useQuery(
    { tiktokAccountId: selectedId! },
    { enabled: !!selectedId },
  );
  const sessions = api.automationSession.listByAccount.useQuery(
    { tiktokAccountId: selectedId! },
    { enabled: !!selectedId },
  );

  if (!hydrated || isLoading) {
    return <p className="text-muted-foreground p-6">Lade Konten…</p>;
  }

  if (error) {
    return (
      <p className="text-destructive p-6">
        Fehler: {error.message} — evtl. fehlende Berechtigung oder nicht angemeldet.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Übersicht</h1>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-medium">TikTok-Konten</h2>
        {allAccounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Noch kein Konto verbunden. Verbinde TikTok unter{" "}
            <Link
              href="/dashboard/tiktok"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              TikTok-Konto verbinden
            </Link>{" "}
            (OAuth) oder per tRPC-Mutation{" "}
            <code className="rounded bg-muted px-1">tiktokAccount.connect</code>.
          </p>
        ) : (
          <ul className="list-inside list-disc text-sm">
            {allAccounts.map((a) => (
              <li key={a.id}>
                {a.displayName ?? a.handle ?? a.openId}{" "}
                <span className="text-muted-foreground">({a.id})</span>
                {a.disconnectedAt ? (
                  <span className="text-muted-foreground"> — getrennt</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedId ? (
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
      ) : allAccounts.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Wähle oben ein verbundenes TikTok-Konto aus, um Videos, Regeln und
          Sessions zu sehen.
        </p>
      ) : null}
    </div>
  );
}
