import { env } from "@/env";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";

export type TikTokOAuthSecrets = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

export function resolveTikTokOAuthSecrets(): TikTokOAuthSecrets | null {
  const clientKey = env.AUTH_TIKTOK_CLIENT_KEY;
  const clientSecret = env.AUTH_TIKTOK_CLIENT_SECRET;
  const redirectUri = env.AUTH_TIKTOK_REDIRECT_URI;
  if (!clientKey || !clientSecret || !redirectUri) return null;

  const trimmedScopes = env.AUTH_TIKTOK_SCOPES?.trim() ?? "";
  const scopes =
    trimmedScopes.length > 0
      ? trimmedScopes
      : "user.info.basic,user.info.profile";

  return { clientKey, clientSecret, redirectUri, scopes };
}

export function buildTikTokAuthorizeURL(secrets: TikTokOAuthSecrets, state: string) {
  const params = new URLSearchParams({
    client_key: secrets.clientKey,
    scope: secrets.scopes,
    response_type: "code",
    redirect_uri: secrets.redirectUri,
    state,
    disable_auto_auth: "1",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  open_id: string;
  refresh_expires_in: number;
  scope?: string;
  token_type?: string;
};

/** Antwort von grant_type=refresh_token (oft ohne erneutes open_id). */
export type TikTokTokenRefreshResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  scope?: string;
  token_type?: string;
};

export async function exchangeTikTokAuthorizationCode(
  secrets: TikTokOAuthSecrets,
  code: string,
): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: secrets.clientKey,
    client_secret: secrets.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: secrets.redirectUri,
  });

  return postAuthorizationCodeTokenRequest(body);
}

/**
 * Access-Token erneuern (grant_type=refresh_token).
 * @see https://developers.tiktok.com/doc/oauth-user-access-token-management
 */
export async function refreshTikTokAccessToken(
  secrets: TikTokOAuthSecrets,
  refreshToken: string,
): Promise<TikTokTokenRefreshResult> {
  const body = new URLSearchParams({
    client_key: secrets.clientKey,
    client_secret: secrets.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return postRefreshTokenRequest(body);
}

async function postAuthorizationCodeTokenRequest(
  body: URLSearchParams,
): Promise<TikTokTokenResponse> {
  const record = await postTikTokTokenRaw(body);
  const base = extractTokenPayload(record);

  const open_id = record.open_id;
  if (typeof open_id !== "string") {
    throw new Error("Unerwartete Token-Antwort von TikTok (open_id fehlt).");
  }

  return { ...base, open_id };
}

async function postRefreshTokenRequest(
  body: URLSearchParams,
): Promise<TikTokTokenRefreshResult> {
  const record = await postTikTokTokenRaw(body);
  return extractTokenPayload(record);
}

async function postTikTokTokenRaw(
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });

  const json: unknown = await res.json();
  const record = json as Record<string, unknown>;

  if (typeof record.error === "string") {
    const err = record.error_description ?? record.error;
    throw new Error(
      typeof err === "string" ? err : "Token-Austausch fehlgeschlagen.",
    );
  }

  if (!res.ok) {
    const err = record.error_description ?? record.error ?? res.statusText;
    throw new Error(
      typeof err === "string" ? err : "Token-Austausch fehlgeschlagen.",
    );
  }

  return record;
}

function extractTokenPayload(
  record: Record<string, unknown>,
): Omit<TikTokTokenResponse, "open_id"> {
  const access_token = record.access_token;
  const refresh_token = record.refresh_token;
  const expires_in = record.expires_in;

  if (
    typeof access_token !== "string" ||
    typeof refresh_token !== "string" ||
    typeof expires_in !== "number"
  ) {
    throw new Error("Unerwartete Token-Antwort von TikTok.");
  }

  return {
    access_token,
    expires_in,
    refresh_token,
    refresh_expires_in:
      typeof record.refresh_expires_in === "number"
        ? record.refresh_expires_in
        : 0,
    scope: typeof record.scope === "string" ? record.scope : undefined,
    token_type:
      typeof record.token_type === "string" ? record.token_type : undefined,
  };
}

export type TikTokUserProfilePartial = {
  display_name?: string;
  avatar_url?: string;
  username?: string;
};

export async function fetchTikTokUserProfile(
  accessToken: string,
): Promise<TikTokUserProfilePartial | null> {
  const fields = ["open_id", "display_name", "avatar_url", "username"].join(",");
  const url = `${USERINFO_URL}?fields=${encodeURIComponent(fields)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const json: unknown = await res.json();
  const top = json as {
    data?: { user?: Record<string, unknown> };
    error?: { code?: string; message?: string };
  };

  if (!res.ok || (top.error?.code && top.error.code !== "ok")) {
    return null;
  }

  const u = top.data?.user;
  if (!u) return null;

  return {
    display_name:
      typeof u.display_name === "string" ? u.display_name : undefined,
    avatar_url:
      typeof u.avatar_url === "string" ? u.avatar_url : undefined,
    username: typeof u.username === "string" ? u.username : undefined,
  };
}
