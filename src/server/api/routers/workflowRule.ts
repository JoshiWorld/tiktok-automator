import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  permissionProcedure,
} from "@/server/api/trpc";
import { PERMISSIONS } from "@/server/rbac/permissions";
import {
  getOwnedTikTokAccount,
  getOwnedWorkflowRule,
} from "@/server/tiktok/ownership";
import {
  normalizeTriggerTerm,
  parseWorkflowActions,
} from "@/server/workflow/action-schemas";
import { MatchMode, TriggerType } from "../../../../generated/prisma/enums";

const ruleInclude = {
  triggerTerms: true,
  workflow: { include: { actions: { orderBy: { order: "asc" as const } } } },
  monitoredVideo: true,
} as const;

export const workflowRuleRouter = createTRPCRouter({
  listByAccount: permissionProcedure(PERMISSIONS.WORKFLOW_RULE_READ)
    .input(z.object({ tiktokAccountId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(
        ctx.db,
        ctx.session.user.id,
        input.tiktokAccountId,
      );
      return ctx.db.workflowRule.findMany({
        where: { tiktokAccountId: input.tiktokAccountId },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: ruleInclude,
      });
    }),

  byId: permissionProcedure(PERMISSIONS.WORKFLOW_RULE_READ)
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedWorkflowRule(ctx.db, ctx.session.user.id, input.id);
      return ctx.db.workflowRule.findFirst({
        where: {
          id: input.id,
          tiktokAccount: { userId: ctx.session.user.id },
        },
        include: ruleInclude,
      });
    }),

  create: permissionProcedure(PERMISSIONS.WORKFLOW_RULE_CREATE)
    .input(
      z.object({
        tiktokAccountId: z.string().cuid(),
        triggerType: z.nativeEnum(TriggerType),
        matchMode: z.nativeEnum(MatchMode).optional(),
        priority: z.number().int().optional(),
        enabled: z.boolean().optional(),
        monitoredVideoId: z.string().cuid().optional().nullable(),
        terms: z.array(z.string().min(1)).min(1),
        actions: z.array(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTikTokAccount(
        ctx.db,
        ctx.session.user.id,
        input.tiktokAccountId,
      );

      if (input.monitoredVideoId) {
        const v = await ctx.db.monitoredVideo.findFirst({
          where: {
            id: input.monitoredVideoId,
            tiktokAccountId: input.tiktokAccountId,
          },
        });
        if (!v) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "monitoredVideoId gehört nicht zu diesem TikTok-Konto.",
          });
        }
      }

      const normalizedTerms = [...new Set(input.terms.map(normalizeTriggerTerm))].filter(
        (t) => t.length > 0,
      );
      if (normalizedTerms.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Mindestens ein Trigger-Begriff nach Normalisierung erforderlich.",
        });
      }

      const actions = parseWorkflowActions(input.actions);

      return ctx.db.$transaction(async (tx) => {
        const rule = await tx.workflowRule.create({
          data: {
            tiktokAccountId: input.tiktokAccountId,
            triggerType: input.triggerType,
            matchMode: input.matchMode ?? MatchMode.CONTAINS,
            priority: input.priority ?? 0,
            enabled: input.enabled ?? true,
            monitoredVideoId: input.monitoredVideoId ?? null,
          },
        });

        await tx.triggerTerm.createMany({
          data: normalizedTerms.map((normalizedTerm) => ({
            workflowRuleId: rule.id,
            normalizedTerm,
          })),
        });

        const workflow = await tx.workflow.create({
          data: { workflowRuleId: rule.id },
        });

        await tx.workflowAction.createMany({
          data: actions.map((a) => ({
            workflowId: workflow.id,
            type: a.type,
            order: a.order,
            payload: a.payload,
          })),
        });

        return tx.workflowRule.findFirstOrThrow({
          where: { id: rule.id },
          include: ruleInclude,
        });
      });
    }),

  update: permissionProcedure(PERMISSIONS.WORKFLOW_RULE_UPDATE)
    .input(
      z.object({
        id: z.string().cuid(),
        triggerType: z.nativeEnum(TriggerType).optional(),
        matchMode: z.nativeEnum(MatchMode).optional(),
        priority: z.number().int().optional(),
        enabled: z.boolean().optional(),
        monitoredVideoId: z.string().cuid().optional().nullable(),
        terms: z.array(z.string().min(1)).min(1).optional(),
        actions: z.array(z.unknown()).min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rule = await getOwnedWorkflowRule(
        ctx.db,
        ctx.session.user.id,
        input.id,
      );

      if (input.monitoredVideoId) {
        const v = await ctx.db.monitoredVideo.findFirst({
          where: {
            id: input.monitoredVideoId,
            tiktokAccountId: rule.tiktokAccountId,
          },
        });
        if (!v) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "monitoredVideoId gehört nicht zu diesem TikTok-Konto.",
          });
        }
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.workflowRule.update({
          where: { id: input.id },
          data: {
            ...(input.triggerType !== undefined
              ? { triggerType: input.triggerType }
              : {}),
            ...(input.matchMode !== undefined ? { matchMode: input.matchMode } : {}),
            ...(input.priority !== undefined ? { priority: input.priority } : {}),
            ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
            ...(input.monitoredVideoId !== undefined
              ? { monitoredVideoId: input.monitoredVideoId }
              : {}),
          },
        });

        if (input.terms) {
          const normalizedTerms = [...new Set(input.terms.map(normalizeTriggerTerm))].filter(
            (t) => t.length > 0,
          );
          if (normalizedTerms.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Mindestens ein Trigger-Begriff erforderlich.",
            });
          }
          await tx.triggerTerm.deleteMany({ where: { workflowRuleId: input.id } });
          await tx.triggerTerm.createMany({
            data: normalizedTerms.map((normalizedTerm) => ({
              workflowRuleId: input.id,
              normalizedTerm,
            })),
          });
        }

        if (input.actions) {
          const actions = parseWorkflowActions(input.actions);
          const workflow = await tx.workflow.findUnique({
            where: { workflowRuleId: input.id },
          });
          if (!workflow) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Workflow fehlt für diese Regel.",
            });
          }
          await tx.workflowAction.deleteMany({ where: { workflowId: workflow.id } });
          await tx.workflowAction.createMany({
            data: actions.map((a) => ({
              workflowId: workflow.id,
              type: a.type,
              order: a.order,
              payload: a.payload,
            })),
          });
        }

        return tx.workflowRule.findFirstOrThrow({
          where: { id: input.id },
          include: ruleInclude,
        });
      });
    }),

  delete: permissionProcedure(PERMISSIONS.WORKFLOW_RULE_DELETE)
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedWorkflowRule(ctx.db, ctx.session.user.id, input.id);
      await ctx.db.workflowRule.delete({ where: { id: input.id } });
      return { ok: true as const };
    }),
});
