/** CSRF-State (muss mit Query `state` von TikTok übereinstimmen). */
export const TIKTOK_OAUTH_STATE_COOKIE = "tiktok_oauth_state";

/** App-User-ID zu dem diese OAuth-Anfrage gehört — Callback prüft Session erneut. */
export const TIKTOK_OAUTH_USER_COOKIE = "tiktok_oauth_uid";

/** maxAge Sekunden OAuth-Cookies */
export const TIKTOK_OAUTH_COOKIE_MAXAGE = 600;

export function tiktokOAuthCookieSettings(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TIKTOK_OAUTH_COOKIE_MAXAGE,
  };
}
