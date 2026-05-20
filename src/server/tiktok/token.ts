import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "../../../generated/prisma/client";
import {
  refreshTikTokAccessToken,
  resolveTikTokOAuthSecrets,
} from "@/server/tiktok/oauth";
import { getOwnedTikTokAccount } from "@/server/tiktok/ownership";

/** Puffer gegen ablaufenden Access Token (sekündlich). */
export const ACCESS_TOKEN_SKEW_MS = 120_000;

/**
 * Gibt einen gültigen Access Token für TikTok API-Aufrufe zurück und aktualisiert ggf.
 * die Datenbank (Refresh über client_secret nur server-seitig).
 */
export async function getValidAccessTokenForAccount(
  db: PrismaClient,
  userId: string,
  tiktokAccountId: string,
): Promise<{ accessToken: string }> {
  const secrets = resolveTikTokOAuthSecrets();
  if (!secrets) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "TikTok OAuth ist nicht konfiguriert (CLIENT_KEY / SECRET / REDIRECT_URI).",
    });
  }

  const account = await getOwnedTikTokAccount(db, userId, tiktokAccountId);

  if (account.disconnectedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Dieses TikTok-Konto ist getrennt.",
    });
  }

  if (!account.refreshToken) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Kein Refresh-Token gespeichert — bitte Konto neu verbinden.",
    });
  }

  const now = Date.now();
  if (
    account.accessToken &&
    account.expiresAt.getTime() - ACCESS_TOKEN_SKEW_MS > now
  ) {
    return { accessToken: account.accessToken };
  }

  const tokens = await refreshTikTokAccessToken(secrets, account.refreshToken);
  await db.tikTokAccount.update({
    where: { id: account.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(now + tokens.expires_in * 1000),
      lastTokenRefreshAt: new Date(),
    },
  });

  return { accessToken: tokens.access_token };
}
