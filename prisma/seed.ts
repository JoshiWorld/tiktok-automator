import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PERMISSION_DEFINITIONS: { key: string; description: string }[] = [
  {
    key: "tiktok.account.read",
    description: "TikTok-Konten des Nutzers einsehen",
  },
  {
    key: "tiktok.account.connect",
    description: "TikTok-Konto verbinden / Token anlegen",
  },
  {
    key: "monitoredVideo.manage",
    description: "Überwachte Videos verwalten",
  },
  {
    key: "workflow.rule.read",
    description: "Workflow-Regeln und Trigger lesen",
  },
  {
    key: "workflow.rule.create",
    description: "Workflow-Regeln anlegen",
  },
  {
    key: "workflow.rule.update",
    description: "Workflow-Regeln bearbeiten",
  },
  {
    key: "workflow.rule.delete",
    description: "Workflow-Regeln löschen",
  },
  {
    key: "automation.session.read",
    description: "Automations-Sessions einsehen",
  },
  {
    key: "automation.session.manage",
    description: "Automations-Sessions anlegen/abbrechen",
  },
  {
    key: "tiktok.dm.read",
    description: "Gespiegelte TikTok-DMs einsehen",
  },
  {
    key: "tiktok.dm.sync",
    description: "TikTok-Datenquellen für DMs anstoßen (falls verfügbar)",
  },
];

/** Keys granted to the default "Free" group (non-superuser). */
const FREE_GROUP_PERMISSION_KEYS = [
  "tiktok.account.read",
  "tiktok.account.connect",
  "monitoredVideo.manage",
  "workflow.rule.read",
  "workflow.rule.create",
  "workflow.rule.update",
  "workflow.rule.delete",
  "automation.session.read",
  "automation.session.manage",
  "tiktok.dm.read",
  "tiktok.dm.sync",
] as const;

async function main() {
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: { key: def.key, description: def.description },
      update: { description: def.description },
    });
  }

  const freeGroup = await prisma.group.upsert({
    where: { slug: "free" },
    create: {
      slug: "free",
      name: "Free",
      description: "Standardgruppe für neue Nutzer",
      isSuperuser: false,
    },
    update: {
      name: "Free",
      description: "Standardgruppe für neue Nutzer",
      isSuperuser: false,
    },
  });

  await prisma.group.upsert({
    where: { slug: "administrator" },
    create: {
      slug: "administrator",
      name: "Administrator",
      description: "Voller Zugriff (Superuser)",
      isSuperuser: true,
    },
    update: {
      name: "Administrator",
      description: "Voller Zugriff (Superuser)",
      isSuperuser: true,
    },
  });

  const freePermissions = await prisma.permission.findMany({
    where: { key: { in: [...FREE_GROUP_PERMISSION_KEYS] } },
  });

  await prisma.groupPermission.createMany({
    data: freePermissions.map((perm) => ({
      groupId: freeGroup.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  });

  // Administrator is superuser — no GroupPermission rows required.

  const usersWithoutGroup = await prisma.user.findMany({
    where: { userGroups: { none: {} } },
    select: { id: true },
  });

  if (usersWithoutGroup.length > 0) {
    await prisma.userGroup.createMany({
      data: usersWithoutGroup.map((u) => ({
        userId: u.id,
        groupId: freeGroup.id,
      })),
      skipDuplicates: true,
    });
  }

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
