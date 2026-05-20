import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    /** Öffentliche App-URL (ohne trailing slash), z. B. hinter Reverse-Proxy/Tunnel */
    AUTH_URL: z.string().url().optional(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /** TikTok Login Kit (optional — OAuth-Routen prüfen zur Laufzeit) */
    AUTH_TIKTOK_CLIENT_KEY: z.string().optional(),
    AUTH_TIKTOK_CLIENT_SECRET: z.string().optional(),
    /** Absolute Callback-URL, muss mit TikTok Portal exakt übereinstimmen (typ. https://...) */
    AUTH_TIKTOK_REDIRECT_URI: z.string().url().optional(),
    /** Komma-getrennte Scopes gemäß App-Konfiguration im Portal */
    AUTH_TIKTOK_SCOPES: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_TIKTOK_CLIENT_KEY: process.env.AUTH_TIKTOK_CLIENT_KEY,
    AUTH_TIKTOK_CLIENT_SECRET: process.env.AUTH_TIKTOK_CLIENT_SECRET,
    AUTH_TIKTOK_REDIRECT_URI: process.env.AUTH_TIKTOK_REDIRECT_URI,
    AUTH_TIKTOK_SCOPES: process.env.AUTH_TIKTOK_SCOPES,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
