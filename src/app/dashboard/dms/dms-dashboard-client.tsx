"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSelectedTikTokAccount } from "@/components/dashboard/active-tiktok-account";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";

type DmThreadRow = RouterOutputs["tiktokMessaging"]["listThreads"][number];

export function DmsDashboardClient() {
  const {
    accounts,
    selectedId,
    hydrated,
    isLoading,
  } = useSelectedTikTokAccount();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);

  const utils = api.useUtils();

  const threadsQuery = api.tiktokMessaging.listThreads.useQuery(
    { tiktokAccountId: selectedId! },
    { enabled: !!selectedId },
  );

  const messagesQuery = api.tiktokMessaging.listMessages.useQuery(
    {
      tiktokAccountId: selectedId!,
      conversationId: conversationId ?? "",
    },
    { enabled: !!selectedId && conversationId !== null && conversationId.length > 0 },
  );

  const requestSyncMut = api.tiktokMessaging.requestSync.useMutation({
    onSuccess(res) {
      setSyncHint(res.detail);
      void utils.tiktokMessaging.invalidate();
    },
    onError(err) {
      setSyncHint(err.message);
    },
  });

  useEffect(() => {
    if (
      threadsQuery.data?.length &&
      (!conversationId ||
        !threadsQuery.data.some((t) => t.conversationId === conversationId))
    ) {
      setConversationId(threadsQuery.data[0]!.conversationId);
    }
  }, [threadsQuery.data, conversationId]);

  if (!hydrated || isLoading) {
    return <p className="text-muted-foreground p-6">Lade Konten…</p>;
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground mb-4 text-sm">
          Verbinde zuerst ein TikTok-Konto, um hier Nachrichten zu sehen.
        </p>
        <Button asChild variant="outline" className="cursor-pointer">
          <Link href="/dashboard/tiktok">Zu TikTok verbinden</Link>
        </Button>
      </div>
    );
  }

  const handleSync =
    selectedId !== null && selectedId.length > 0
      ? () => requestSyncMut.mutate({ tiktokAccountId: selectedId })
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nachrichten</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Anzeige aus lokal gespeicherten Daten (aktuell keine Live-TikTok-Inbox).
            Offiziellen Import (Data Portability o. Ä.) später anbindbar. Direktantwort aus
            der App ist erst geplant, sobald TikTok ein freigegebenes Versand-Produkt
            ermöglicht.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!selectedId || requestSyncMut.isPending}
          onClick={() => handleSync?.()}
          className="cursor-pointer shrink-0"
        >
          {requestSyncMut.isPending ? "Sync wird ausgeführt…" : "Synchronisation anstoßen"}
        </Button>
      </div>

      {syncHint ? (
        <p className="bg-muted rounded-md border px-3 py-2 text-sm">{syncHint}</p>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden rounded-lg border md:h-[calc(100vh-12rem)] md:min-h-[420px]">
        <div className="border-border flex w-full flex-col border-b md:w-72 md:shrink-0 md:border-r md:border-b-0">
          <div className="text-muted-foreground border-b px-3 py-2 text-xs font-medium uppercase">
            Unterhaltungen
          </div>
          <ScrollArea className="h-48 flex-1 md:h-full">
            {threadsQuery.isLoading ? (
              <p className="text-muted-foreground p-3 text-sm">Lade…</p>
            ) : threadsQuery.error ? (
              <p className="text-destructive p-3 text-sm">
                {threadsQuery.error.message}
              </p>
            ) : (threadsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">
                Noch keine gespiegelten Nachrichten. Nach Anbindung einer offiziellen
                Datenquelle erscheinen Konversationen hier.
              </p>
            ) : (
              <ul className="p-1">
                {threadsQuery.data!.map((t: DmThreadRow) => (
                  <li key={t.conversationId}>
                    <button
                      type="button"
                      onClick={() => setConversationId(t.conversationId)}
                      className={cn(
                        "hover:bg-accent w-full rounded-md px-2 py-2 text-left text-sm transition-colors",
                        conversationId === t.conversationId && "bg-accent",
                      )}
                    >
                      <div className="text-muted-foreground truncate text-xs">
                        {t.conversationId}
                      </div>
                      <div className="truncate">{t.preview || "—"}</div>
                      <div className="text-muted-foreground text-xs">
                        {t.lastOccurredAt.toLocaleString()} · {t.lastDirection}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="text-muted-foreground border-b px-3 py-2 text-xs font-medium uppercase">
            Verlauf
          </div>
          <ScrollArea className="min-h-0 flex-1 p-3">
            {!conversationId ? (
              <p className="text-muted-foreground text-sm">
                Wähle links eine Unterhaltung.
              </p>
            ) : messagesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Lade Nachrichten…</p>
            ) : messagesQuery.error ? (
              <p className="text-destructive text-sm">{messagesQuery.error.message}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {(messagesQuery.data ?? []).map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
                      m.direction === "OUTBOUND"
                        ? "border-primary/30 bg-primary/5 ml-auto"
                        : "border-border bg-muted/40 mr-auto",
                    )}
                  >
                    <div className="text-muted-foreground mb-1 text-xs">
                      {m.occurredAt.toLocaleString()}
                      {m.senderHandle ? ` · @${m.senderHandle}` : ""}
                      {m.direction === "OUTBOUND" ? " · ausgehend" : " · eingehend"}
                    </div>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>

          <div className="border-t p-3">
            <Textarea
              disabled
              readOnly
              placeholder="Antworten über die App ist noch nicht verfügbar — siehe Hinweis oben."
              className="text-muted-foreground mb-2 min-h-[80px] resize-none"
              aria-label="Nachrichtentext (deaktiviert)"
            />
            <Button type="button" disabled className="w-full cursor-not-allowed md:w-auto">
              Senden (noch nicht unterstützt)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
