import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  permissionProcedure,
} from "@/server/api/trpc";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getOwnedTikTokAccount } from "@/server/tiktok/ownership";

const accountPublicSelect = {
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

export const tiktokAccountRouter = createTRPCRouter({
  list: permissionProcedure(PERMISSIONS.TIKTOK_ACCOUNT_READ).query(
    async ({ ctx }) => {
      return ctx.db.tikTokAccount.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        select: accountPublicSelect,
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
        select: accountPublicSelect,
      });
    }),

  /**
   * Verknüpft ein TikTok-Konto (OAuth/Token-Flow kommt später — hier: Token-Daten setzen).
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
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.tikTokAccount.findUnique({
        where: { openId: input.openId },
      });
      if (existing && existing.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Diese TikTok-openId ist bereits mit einem anderen Nutzer verknüpft.",
        });
      }

      const data = {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        handle: input.handle ?? null,
        displayName: input.displayName ?? null,
        avatarUrl: input.avatarUrl === "" ? null : (input.avatarUrl ?? null),
        disconnectedAt: null,
        lastTokenRefreshAt: new Date(),
      };

      if (existing) {
        return ctx.db.tikTokAccount.update({
          where: { id: existing.id },
          data,
          select: accountPublicSelect,
        });
      }

      return ctx.db.tikTokAccount.create({
        data: {
          userId: ctx.session.user.id,
          openId: input.openId,
          ...data,
        },
        select: accountPublicSelect,
      });
    }),

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
        select: accountPublicSelect,
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
        select: accountPublicSelect,
      });
    }),
});
