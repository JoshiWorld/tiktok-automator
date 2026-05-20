import { NextResponse, type NextRequest } from "next/server";
import { TRPCError } from "@trpc/server";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getPublicOriginFromRequest } from "@/server/http/public-origin";
import { linkTikTokAccountForUser } from "@/server/tiktok/link-account";
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_OAUTH_USER_COOKIE,
  tiktokOAuthCookieSettings,
} from "@/server/tiktok/oauth-cookies";
import {
  exchangeTikTokAuthorizationCode,
  fetchTikTokUserProfile,
  resolveTikTokOAuthSecrets,
} from "@/server/tiktok/oauth";

export async function GET(request: NextRequest) {
  const base = getPublicOriginFromRequest(request);
  const sp = request.nextUrl.searchParams;

  const errRedirect = (message: string) => {
    const u = new URL("/dashboard/tiktok", base);
    u.searchParams.set("tiktok_error", encodeURIComponent(message));
    const res = NextResponse.redirect(u);
    const ttl = tiktokOAuthCookieSettings();
    res.cookies.delete({ name: TIKTOK_OAUTH_STATE_COOKIE, path: ttl.path });
    res.cookies.delete({ name: TIKTOK_OAUTH_USER_COOKIE, path: ttl.path });
    return res;
  };

  const oauthError = sp.get("error");
  const errorDescription = sp.get("error_description");
  if (oauthError) {
    return errRedirect(
      oauthErrorDescriptionToText(errorDescription) ?? oauthError,
    );
  }

  const cfg = resolveTikTokOAuthSecrets();
  if (!cfg) {
    return errRedirect("TikTok OAuth ist nicht konfiguriert.");
  }

  const code = sp.get("code");
  const state = sp.get("state");
  const savedState = request.cookies.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;
  const savedUserId = request.cookies.get(TIKTOK_OAUTH_USER_COOKIE)?.value;

  const clearCookieRedirect = NextResponse.redirect(
    new URL("/dashboard/tiktok?tiktok_success=1", base),
  );
  const ttl = tiktokOAuthCookieSettings();
  clearCookieRedirect.cookies.delete({
    name: TIKTOK_OAUTH_STATE_COOKIE,
    path: ttl.path,
  });
  clearCookieRedirect.cookies.delete({
    name: TIKTOK_OAUTH_USER_COOKIE,
    path: ttl.path,
  });

  if (
    !code ||
    !state ||
    !savedState ||
    !savedUserId ||
    state !== savedState
  ) {
    return errRedirect(
      "Ungültige oder abgelaufene OAuth-Antwort. Bitte erneut „Mit TikTok verbinden“ wählen.",
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || userId !== savedUserId) {
    return errRedirect(
      "Die Anmeldung stimmt nicht mit dem gestarteten Vorgang überein. Bitte neu anmelden und erneut verbinden.",
    );
  }

  try {
    const token = await exchangeTikTokAuthorizationCode(cfg, code);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    const profile =
      (await fetchTikTokUserProfile(token.access_token).catch(() => null)) ??
      null;

    await linkTikTokAccountForUser(db, userId, {
      openId: token.open_id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt,
      handle: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });
  } catch (e: unknown) {
    if (e instanceof TRPCError) {
      return errRedirect(e.message);
    }
    const msg =
      e instanceof Error
        ? e.message
        : "Unbekannter Fehler beim Verbinden.";
    return errRedirect(msg);
  }

  return clearCookieRedirect;
}

function oauthErrorDescriptionToText(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}
