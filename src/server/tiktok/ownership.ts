import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "../../../generated/prisma/client";

export async function getOwnedTikTokAccount(
  db: PrismaClient,
  userId: string,
  tiktokAccountId: string,
) {
  const account = await db.tikTokAccount.findFirst({
    where: { id: tiktokAccountId, userId },
  });
  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "TikTok-Konto nicht gefunden oder keine Berechtigung.",
    });
  }
  return account;
}

export async function getOwnedMonitoredVideo(
  db: PrismaClient,
  userId: string,
  monitoredVideoId: string,
) {
  const video = await db.monitoredVideo.findFirst({
    where: {
      id: monitoredVideoId,
      tiktokAccount: { userId },
    },
  });
  if (!video) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Video nicht gefunden oder keine Berechtigung.",
    });
  }
  return video;
}

export async function getOwnedWorkflowRule(
  db: PrismaClient,
  userId: string,
  workflowRuleId: string,
) {
  const rule = await db.workflowRule.findFirst({
    where: {
      id: workflowRuleId,
      tiktokAccount: { userId },
    },
  });
  if (!rule) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workflow-Regel nicht gefunden oder keine Berechtigung.",
    });
  }
  return rule;
}
