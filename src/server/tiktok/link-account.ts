import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "../../../generated/prisma/client";

/** Felder ohne Secrets — für Liste und Mutation-Returns. */
export const tikTokAccountPublicSelect = {
  id: true,
  openId: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
  connectedAt: true,
  disconnectedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type LinkTikTokAccountInput = {
  openId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  handle?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

/**
 * Persistiert oder aktualisiert ein TikTok-Konto für einen App-Nutzer (OAuth oder manuelle connect-Mutation).
 */
export async function linkTikTokAccountForUser(
  db: PrismaClient,
  userId: string,
  input: LinkTikTokAccountInput,
) {
  const existing = await db.tikTokAccount.findUnique({
    where: { openId: input.openId },
  });
  if (existing && existing.userId !== userId) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Diese TikTok-openId ist bereits mit einem anderen Nutzer verknüpft.",
    });
  }

  const data = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
    handle: input.handle ?? null,
    displayName: input.displayName ?? null,
    avatarUrl: input.avatarUrl ?? null,
    disconnectedAt: null,
    lastTokenRefreshAt: new Date(),
  };

  if (existing) {
    return db.tikTokAccount.update({
      where: { id: existing.id },
      data,
      select: tikTokAccountPublicSelect,
    });
  }

  return db.tikTokAccount.create({
    data: {
      userId,
      openId: input.openId,
      ...data,
    },
    select: tikTokAccountPublicSelect,
  });
}
