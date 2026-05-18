import type { PrismaClient } from "../../../generated/prisma/client";

/** Permission keys kept in sync with `Permission` rows (see prisma/seed.ts). */
export const PERMISSIONS = {
  TIKTOK_ACCOUNT_READ: "tiktok.account.read",
  TIKTOK_ACCOUNT_CONNECT: "tiktok.account.connect",
  MONITORED_VIDEO_MANAGE: "monitoredVideo.manage",
  WORKFLOW_RULE_READ: "workflow.rule.read",
  WORKFLOW_RULE_CREATE: "workflow.rule.create",
  WORKFLOW_RULE_UPDATE: "workflow.rule.update",
  WORKFLOW_RULE_DELETE: "workflow.rule.delete",
  AUTOMATION_SESSION_READ: "automation.session.read",
  AUTOMATION_SESSION_MANAGE: "automation.session.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export async function userHasPermission(
  db: PrismaClient,
  userId: string,
  permissionKey: string,
): Promise<boolean> {
  const memberships = await db.userGroup.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          groupPermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  for (const membership of memberships) {
    const { group } = membership;
    if (group.isSuperuser) return true;
    for (const gp of group.groupPermissions) {
      if (gp.permission.key === permissionKey) return true;
    }
  }

  return false;
}
