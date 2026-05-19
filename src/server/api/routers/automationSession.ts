import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  permissionProcedure,
} from "@/server/api/trpc";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getOwnedTikTokAccount, getOwnedWorkflowRule } from "@/server/tiktok/ownership";
import { AutomationSessionState } from "../../../../generated/prisma/enums";

export const automationSessionRouter = createTRPCRouter({
  listByAccount: permissionProcedure(PERMISSIONS.AUTOMATION_SESSION_READ)
    .input(
      z.object({
        tiktokAccountId: z.string().cuid(),
        state: z.nativeEnum(AutomationSessionState).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(
        ctx.db,
        ctx.session.user.id,
        input.tiktokAccountId,
      );
      return ctx.db.automationSession.findMany({
        where: {
          tiktokAccountId: input.tiktokAccountId,
          ...(input.state ? { state: input.state } : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: { workflowRule: { select: { id: true, triggerType: true } } },
      });
    }),

  byId: permissionProcedure(PERMISSIONS.AUTOMATION_SESSION_READ)
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.automationSession.findFirst({
        where: {
          id: input.id,
          tiktokAccount: { userId: ctx.session.user.id },
        },
        include: {
          workflowRule: true,
          tiktokAccount: { select: { id: true, openId: true } },
        },
      });
      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session nicht gefunden.",
        });
      }
      return session;
    }),

  create: permissionProcedure(PERMISSIONS.AUTOMATION_SESSION_MANAGE)
    .input(
      z.object({
        tiktokAccountId: z.string().cuid(),
        workflowRuleId: z.string().cuid(),
        participantOpenId: z.string().min(1),
        expiresAt: z.coerce.date(),
        context: z.record(z.string(), z.unknown()).optional(),
        initialStepIndex: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(
        ctx.db,
        ctx.session.user.id,
        input.tiktokAccountId,
      );
      const rule = await getOwnedWorkflowRule(
        ctx.db,
        ctx.session.user.id,
        input.workflowRuleId,
      );
      if (rule.tiktokAccountId !== input.tiktokAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Workflow-Regel gehört nicht zu diesem TikTok-Konto.",
        });
      }
      return ctx.db.automationSession.create({
        data: {
          tiktokAccountId: input.tiktokAccountId,
          workflowRuleId: input.workflowRuleId,
          participantOpenId: input.participantOpenId,
          expiresAt: input.expiresAt,
          context: (input.context ?? {}) as object,
          currentStepIndex: input.initialStepIndex ?? 0,
          state: AutomationSessionState.ACTIVE,
        },
        include: {
          workflowRule: { select: { id: true, triggerType: true } },
        },
      });
    }),

  setState: permissionProcedure(PERMISSIONS.AUTOMATION_SESSION_MANAGE)
    .input(
      z.object({
        id: z.string().cuid(),
        state: z.nativeEnum(AutomationSessionState),
        currentStepIndex: z.number().int().min(0).optional(),
        context: z.record(z.string(), z.unknown()).optional(),
        lastInboundMessageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.automationSession.findFirst({
        where: {
          id: input.id,
          tiktokAccount: { userId: ctx.session.user.id },
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session nicht gefunden.",
        });
      }
      return ctx.db.automationSession.update({
        where: { id: input.id },
        data: {
          state: input.state,
          ...(input.currentStepIndex !== undefined
            ? { currentStepIndex: input.currentStepIndex }
            : {}),
          ...(input.context !== undefined
            ? { context: input.context as object }
            : {}),
          ...(input.lastInboundMessageId !== undefined
            ? { lastInboundMessageId: input.lastInboundMessageId }
            : {}),
        },
        include: {
          workflowRule: { select: { id: true, triggerType: true } },
        },
      });
    }),

  cancel: permissionProcedure(PERMISSIONS.AUTOMATION_SESSION_MANAGE)
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.automationSession.findFirst({
        where: {
          id: input.id,
          tiktokAccount: { userId: ctx.session.user.id },
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session nicht gefunden.",
        });
      }
      return ctx.db.automationSession.update({
        where: { id: input.id },
        data: { state: AutomationSessionState.ABORTED },
        include: {
          workflowRule: { select: { id: true, triggerType: true } },
        },
      });
    }),

  delete: permissionProcedure(PERMISSIONS.AUTOMATION_SESSION_MANAGE)
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.automationSession.findFirst({
        where: {
          id: input.id,
          tiktokAccount: { userId: ctx.session.user.id },
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session nicht gefunden.",
        });
      }
      await ctx.db.automationSession.delete({ where: { id: input.id } });
      return { ok: true as const };
    }),
});
