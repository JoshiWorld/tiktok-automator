import { z } from "zod";

import {
  createTRPCRouter,
  permissionProcedure,
} from "@/server/api/trpc";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { requestDmSyncPlaceholder } from "@/server/tiktok/direct-messages/sync";
import { getOwnedTikTokAccount } from "@/server/tiktok/ownership";
import type { DmMirrorDirection } from "../../../../generated/prisma/client";

export const tiktokMessagingRouter = createTRPCRouter({
  /**
   * Letzte Aktivität pro Konversation aus dem lokal gespiegelten Bestand (ohne TikTok Live-Calls).
   */
  listThreads: permissionProcedure(PERMISSIONS.TIKTOK_DM_READ)
    .input(z.object({ tiktokAccountId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(ctx.db, ctx.session.user.id, input.tiktokAccountId);

      const rows = await ctx.db.dmMessageMirror.findMany({
        where: { tiktokAccountId: input.tiktokAccountId },
        orderBy: { occurredAt: "desc" },
        select: {
          externalConversationId: true,
          body: true,
          occurredAt: true,
          direction: true,
          senderHandle: true,
          externalMessageId: true,
        },
      });

      const byConv = new Map<
        string,
        {
          conversationId: string;
          preview: string;
          lastOccurredAt: Date;
          lastDirection: (typeof rows)[number]["direction"];
        }
      >();

      for (const m of rows) {
        if (!byConv.has(m.externalConversationId)) {
          byConv.set(m.externalConversationId, {
            conversationId: m.externalConversationId,
            preview: m.body.slice(0, 160),
            lastOccurredAt: m.occurredAt,
            lastDirection: m.direction,
          });
        }
      }

      return [...byConv.values()].sort(
        (a, b) => b.lastOccurredAt.getTime() - a.lastOccurredAt.getTime(),
      );
    }),

  listMessages: permissionProcedure(PERMISSIONS.TIKTOK_DM_READ)
    .input(
      z.object({
        tiktokAccountId: z.string().cuid(),
        conversationId: z.string().min(1).max(512),
      }),
    )
    .query(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(ctx.db, ctx.session.user.id, input.tiktokAccountId);

      const rows = (await ctx.db.dmMessageMirror.findMany({
        where: {
          tiktokAccountId: input.tiktokAccountId,
          externalConversationId: input.conversationId,
        },
        orderBy: { occurredAt: "asc" },
        take: 500,
        select: {
          id: true,
          body: true,
          occurredAt: true,
          direction: true,
          senderOpenId: true,
          senderHandle: true,
          externalMessageId: true,
        },
      })) as Array<{
        id: string;
        body: string;
        occurredAt: Date;
        direction: DmMirrorDirection;
        senderOpenId: string | null;
        senderHandle: string | null;
        externalMessageId: string;
      }>;

      return rows;
    }),

  requestSync: permissionProcedure(PERMISSIONS.TIKTOK_DM_SYNC)
    .input(z.object({ tiktokAccountId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(ctx.db, ctx.session.user.id, input.tiktokAccountId);

      /** Optional: später validen Token gegen Portability-Anfragen prüfen */
      return requestDmSyncPlaceholder();
    }),
});
