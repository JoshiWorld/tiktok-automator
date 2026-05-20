import type { NextRequest } from "next/server";

import { env } from "@/env";

/**
 * Öffentliche Origin für Server-Redirects (OAuth, Login).
 * Direkt gegen `localhost:3000` laufend passt `request.nextUrl.origin` — hinter
 * HTTPS-Reverse-Proxy/Tunnel aber oft nicht; dann {@link env.AUTH_URL} oder Forwarded-Headers.
 */
export function getPublicOriginFromRequest(request: NextRequest): string {
  const fromEnv = env.AUTH_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const forwardedHostRaw = request.headers.get("x-forwarded-host");
  const forwardedProtoRaw = request.headers.get("x-forwarded-proto");

  if (forwardedHostRaw) {
    const host = forwardedHostRaw.split(",")[0]!.trim();
    const protoPart = forwardedProtoRaw?.split(",")[0]?.trim();
    const proto =
      protoPart === "http" || protoPart === "https" ? protoPart : "https";
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}
