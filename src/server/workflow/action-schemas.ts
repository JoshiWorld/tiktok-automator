import type { Prisma } from "../../../generated/prisma/client";
import { ActionType } from "../../../generated/prisma/enums";
import { z } from "zod";

const sendDmPayloadSchema = z.object({
  text: z.string().min(1),
});

const replyCommentPayloadSchema = z.object({
  text: z.string().min(1),
});

const likeCommentPayloadSchema = z.object({}).strict();

const waitPayloadSchema = z
  .object({
    expectKeywords: z.array(z.string()).optional(),
    timeoutMinutes: z.number().positive().optional(),
    nextStepOnMatch: z.number().int().min(0).optional(),
  })
  .strict();

const workflowActionRowSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ActionType.SEND_DM),
    order: z.number().int().min(0),
    payload: sendDmPayloadSchema,
  }),
  z.object({
    type: z.literal(ActionType.REPLY_COMMENT),
    order: z.number().int().min(0),
    payload: replyCommentPayloadSchema,
  }),
  z.object({
    type: z.literal(ActionType.LIKE_COMMENT),
    order: z.number().int().min(0),
    payload: likeCommentPayloadSchema,
  }),
  z.object({
    type: z.literal(ActionType.WAIT),
    order: z.number().int().min(0),
    payload: waitPayloadSchema,
  }),
]);

export type WorkflowActionInput = z.infer<typeof workflowActionRowSchema>;

export function normalizeTriggerTerm(raw: string): string {
  return raw.trim().toLowerCase();
}

export function parseWorkflowActions(
  actions: unknown[],
): {
  type: (typeof ActionType)[keyof typeof ActionType];
  order: number;
  payload: Prisma.InputJsonValue;
}[] {
  const parsed = z.array(workflowActionRowSchema).min(1).parse(actions);
  const orders = parsed.map((a) => a.order);
  const unique = new Set(orders);
  if (unique.size !== orders.length) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Jede Workflow-Aktion braucht eine eindeutige order.",
        path: ["actions"],
      },
    ]);
  }
  return parsed.map((a) => ({
    type: a.type,
    order: a.order,
    payload: a.payload as Prisma.InputJsonValue,
  }));
}

export { workflowActionRowSchema };
