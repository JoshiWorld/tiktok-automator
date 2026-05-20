import { z } from "zod";

import {
  createTRPCRouter,
  permissionProcedure,
} from "@/server/api/trpc";
import { PERMISSIONS } from "@/server/rbac/permissions";
import {
  linkTikTokAccountForUser,
  tikTokAccountPublicSelect,
} from "@/server/tiktok/link-account";
import { getOwnedTikTokAccount } from "@/server/tiktok/ownership";
import { resolveTikTokOAuthSecrets } from "@/server/tiktok/oauth";

export const tiktokAccountRouter = createTRPCRouter({
  list: permissionProcedure(PERMISSIONS.TIKTOK_ACCOUNT_READ).query(
    async ({ ctx }) => {
      return ctx.db.tikTokAccount.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        select: tikTokAccountPublicSelect,
      });
    },
  ),

  byId: permissionProcedure(PERMISSIONS.TIKTOK_ACCOUNT_READ)
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(
        ctx.db,
        ctx.session.user.id,
        input.id,
      );
      return ctx.db.tikTokAccount.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: tikTokAccountPublicSelect,
      });
    }),

  /**
   * Manuell/Dev: Token/OpenId direkt setzen — Produktion nutzt den OAuth Pfad (/api/auth/tiktok/start).
   */
  connect: permissionProcedure(PERMISSIONS.TIKTOK_ACCOUNT_CONNECT)
    .input(
      z.object({
        openId: z.string().min(1),
        accessToken: z.string().min(1),
        refreshToken: z.string().min(1),
        expiresAt: z.coerce.date(),
        handle: z.string().optional(),
        displayName: z.string().optional(),
        avatarUrl: z.string().url().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      linkTikTokAccountForUser(ctx.db, ctx.session.user.id, {
        openId: input.openId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        handle: input.handle ?? null,
        displayName: input.displayName ?? null,
        avatarUrl:
          input.avatarUrl === ""
            ? null
            : (input.avatarUrl ?? null),
      }),
    ),

  disconnect: permissionProcedure(PERMISSIONS.TIKTOK_ACCOUNT_CONNECT)
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(ctx.db, ctx.session.user.id, input.id);
      return ctx.db.tikTokAccount.update({
        where: { id: input.id },
        data: {
          disconnectedAt: new Date(),
          accessToken: "",
          refreshToken: "",
        },
        select: tikTokAccountPublicSelect,
      });
    }),

  updateProfile: permissionProcedure(PERMISSIONS.TIKTOK_ACCOUNT_CONNECT)
    .input(
      z.object({
        id: z.string().cuid(),
        handle: z.string().optional(),
        displayName: z.string().optional(),
        avatarUrl: z.string().url().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(ctx.db, ctx.session.user.id, input.id);
      return ctx.db.tikTokAccount.update({
        where: { id: input.id },
        data: {
          ...(input.handle !== undefined ? { handle: input.handle } : {}),
          ...(input.displayName !== undefined
            ? { displayName: input.displayName }
            : {}),
          ...(input.avatarUrl !== undefined
            ? { avatarUrl: input.avatarUrl }
            : {}),
        },
        select: tikTokAccountPublicSelect,
      });
    }),

  oauthConfigured: permissionProcedure(PERMISSIONS.TIKTOK_ACCOUNT_CONNECT).query(
    () => Boolean(resolveTikTokOAuthSecrets()),
  ),
});
