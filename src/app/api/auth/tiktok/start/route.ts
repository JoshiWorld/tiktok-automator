import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/server/auth";
import { getPublicOriginFromRequest } from "@/server/http/public-origin";
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_OAUTH_USER_COOKIE,
  tiktokOAuthCookieSettings,
} from "@/server/tiktok/oauth-cookies";
import {
  buildTikTokAuthorizeURL,
  resolveTikTokOAuthSecrets,
} from "@/server/tiktok/oauth";

export async function GET(request: NextRequest) {
  const cfg = resolveTikTokOAuthSecrets();
  const base = getPublicOriginFromRequest(request);

  const errRedirect = (message: string) => {
    const u = new URL("/dashboard/tiktok", base);
    u.searchParams.set("tiktok_error", encodeURIComponent(message));
    return NextResponse.redirect(u);
  };

  if (!cfg) {
    return errRedirect(
      "TikTok OAuth ist nicht konfiguriert (AUTH_TIKTOK_CLIENT_KEY, CLIENT_SECRET, REDIRECT_URI).",
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    const s = new URL("/api/auth/signin", base);
    s.searchParams.set("callbackUrl", "/api/auth/tiktok/start");
    return NextResponse.redirect(s);
  }

  const state = randomBytes(24).toString("hex");
  const ttl = tiktokOAuthCookieSettings();

  const res = NextResponse.redirect(buildTikTokAuthorizeURL(cfg, state));
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, ttl);
  res.cookies.set(TIKTOK_OAUTH_USER_COOKIE, userId, ttl);
  return res;
}
