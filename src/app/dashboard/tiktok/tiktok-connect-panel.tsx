"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export function TikTokConnectPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flash, setFlash] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  const utils = api.useUtils();
  const accounts = api.tiktokAccount.list.useQuery();
  const oauthOk = api.tiktokAccount.oauthConfigured.useQuery();
  const disconnect = api.tiktokAccount.disconnect.useMutation({
    async onSuccess() {
      await utils.tiktokAccount.list.invalidate();
    },
    onError(error) {
      setFlash({ kind: "error", text: error.message });
    },
  });

  useEffect(() => {
    const ok = searchParams.get("tiktok_success");
    const err = searchParams.get("tiktok_error");
    if (ok) {
      setFlash({ kind: "success", text: "TikTok-Konto wurde verbunden." });
    } else if (err) {
      let text = err;
      try {
        text = decodeURIComponent(err);
      } catch {
        /* keep raw */
      }
      setFlash({ kind: "error", text });
    }
    if (ok ?? err) {
      router.replace("/dashboard/tiktok", { scroll: false });
      void utils.tiktokAccount.list.invalidate();
    }
  }, [searchParams, router, utils.tiktokAccount.list]);

  const busy = disconnect.isPending || accounts.isLoading || oauthOk.isLoading;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          TikTok-Konto verbinden
        </h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Zurück zum Dashboard</Link>
        </Button>
      </div>

      {flash?.kind === "success" ? (
        <p className="rounded-md border border-green-600/40 bg-green-950/30 px-3 py-2 text-sm text-green-100">
          {flash.text}
        </p>
      ) : null}
      {flash?.kind === "error" ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {flash.text}
        </p>
      ) : null}

      <p className="text-muted-foreground text-sm">
        Du wirst zur TikTok-Anmeldung weitergeleitet. Nach Abschluss wird das
        Konto diesem App-Zugang zugeordnet. Redirect und Scopes sind im TikTok
        Developer Portal unter &quot;Login Kit&quot; zu konfigurieren (meist nur{" "}
        <code className="rounded bg-muted px-1">https://…</code> erlaubt).
      </p>

      {!oauthOk.data && !oauthOk.isLoading ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-sm">
          TikTok OAuth ist nicht konfiguriert. Bitte{" "}
          <code className="rounded bg-muted px-1">AUTH_TIKTOK_*</code> in{" "}
          <code className="rounded bg-muted px-1">.env</code> setzen (siehe{" "}
          <code className="rounded bg-muted px-1">.env.example</code>).
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {oauthOk.data ? (
          <Button asChild disabled={busy}>
            <Link href="/api/auth/tiktok/start" prefetch={false}>
              Mit TikTok verbinden
            </Link>
          </Button>
        ) : (
          <Button disabled type="button">
            Mit TikTok verbinden
          </Button>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-medium">Verbundene Konten</h2>
        {accounts.error ? (
          <p className="text-destructive text-sm">
            {accounts.error.message}
          </p>
        ) : null}
        <ul className="space-y-3 text-sm">
          {(accounts.data ?? []).length === 0 && !accounts.isLoading ? (
            <li className="text-muted-foreground">
              Kein TikTok-Konto gespeichert.
            </li>
          ) : null}
          {(accounts.data ?? []).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div>
                <div className="font-medium">
                  {a.displayName ?? a.handle ?? a.openId}
                </div>
                <div className="text-muted-foreground font-mono text-xs">
                  {a.openId}
                </div>
                {a.disconnectedAt ? (
                  <span className="text-muted-foreground text-xs">
                    Getrennt {a.disconnectedAt.toLocaleDateString()}
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={disconnect.isPending}
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm("TikTok-Verbindung wirklich trennen?")
                  ) {
                    return;
                  }
                  disconnect.mutate({ id: a.id });
                }}
              >
                Trennen
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
