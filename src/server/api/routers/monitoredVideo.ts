import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  permissionProcedure,
} from "@/server/api/trpc";
import { PERMISSIONS } from "@/server/rbac/permissions";
import {
  getOwnedMonitoredVideo,
  getOwnedTikTokAccount,
} from "@/server/tiktok/ownership";

export const monitoredVideoRouter = createTRPCRouter({
  listByAccount: permissionProcedure(PERMISSIONS.MONITORED_VIDEO_MANAGE)
    .input(z.object({ tiktokAccountId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(
        ctx.db,
        ctx.session.user.id,
        input.tiktokAccountId,
      );
      return ctx.db.monitoredVideo.findMany({
        where: { tiktokAccountId: input.tiktokAccountId },
        orderBy: { id: "asc" },
      });
    }),

  create: permissionProcedure(PERMISSIONS.MONITORED_VIDEO_MANAGE)
    .input(
      z.object({
        tiktokAccountId: z.string().cuid(),
        videoId: z.string().min(1),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(
        ctx.db,
        ctx.session.user.id,
        input.tiktokAccountId,
      );
      try {
        return await ctx.db.monitoredVideo.create({
          data: {
            tiktokAccountId: input.tiktokAccountId,
            videoId: input.videoId,
            title: input.title ?? null,
          },
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Dieses Video ist für dieses TikTok-Konto bereits registriert.",
        });
      }
    }),

  update: permissionProcedure(PERMISSIONS.MONITORED_VIDEO_MANAGE)
    .input(
      z.object({
        id: z.string().cuid(),
        title: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedMonitoredVideo(ctx.db, ctx.session.user.id, input.id);
      return ctx.db.monitoredVideo.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
        },
      });
    }),

  delete: permissionProcedure(PERMISSIONS.MONITORED_VIDEO_MANAGE)
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedMonitoredVideo(ctx.db, ctx.session.user.id, input.id);
      await ctx.db.monitoredVideo.delete({ where: { id: input.id } });
      return { ok: true as const };
    }),
});
