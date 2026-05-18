-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('COMMENT', 'DM');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('CONTAINS', 'EXACT');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('SEND_DM', 'REPLY_COMMENT', 'LIKE_COMMENT', 'WAIT');

-- CreateEnum
CREATE TYPE "ProcessedEventSource" AS ENUM ('COMMENT', 'DM', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AutomationSessionState" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'ABORTED');

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSuperuser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPermission" (
    "groupId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "GroupPermission_pkey" PRIMARY KEY ("groupId","permissionId")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "TikTokAccount" (
    "id" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "lastTokenRefreshAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TikTokAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredVideo" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT,
    "tiktokAccountId" TEXT NOT NULL,

    CONSTRAINT "MonitoredVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRule" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" "TriggerType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "matchMode" "MatchMode" NOT NULL DEFAULT 'CONTAINS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tiktokAccountId" TEXT NOT NULL,
    "monitoredVideoId" TEXT,

    CONSTRAINT "WorkflowRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerTerm" (
    "id" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "workflowRuleId" TEXT NOT NULL,

    CONSTRAINT "TriggerTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "workflowRuleId" TEXT NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedExternalEvent" (
    "id" TEXT NOT NULL,
    "source" "ProcessedEventSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT,
    "error" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tiktokAccountId" TEXT NOT NULL,
    "workflowRuleId" TEXT,

    CONSTRAINT "ProcessedExternalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSession" (
    "id" TEXT NOT NULL,
    "participantOpenId" TEXT NOT NULL,
    "state" "AutomationSessionState" NOT NULL DEFAULT 'ACTIVE',
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastInboundMessageId" TEXT,
    "tiktokAccountId" TEXT NOT NULL,
    "workflowRuleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Group_slug_key" ON "Group"("slug");

-- CreateIndex
CREATE INDEX "GroupPermission_permissionId_idx" ON "GroupPermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserGroup_groupId_idx" ON "UserGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TikTokAccount_openId_key" ON "TikTokAccount"("openId");

-- CreateIndex
CREATE INDEX "MonitoredVideo_tiktokAccountId_idx" ON "MonitoredVideo"("tiktokAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredVideo_tiktokAccountId_videoId_key" ON "MonitoredVideo"("tiktokAccountId", "videoId");

-- CreateIndex
CREATE INDEX "WorkflowRule_tiktokAccountId_idx" ON "WorkflowRule"("tiktokAccountId");

-- CreateIndex
CREATE INDEX "WorkflowRule_monitoredVideoId_idx" ON "WorkflowRule"("monitoredVideoId");

-- CreateIndex
CREATE INDEX "TriggerTerm_workflowRuleId_idx" ON "TriggerTerm"("workflowRuleId");

-- CreateIndex
CREATE INDEX "TriggerTerm_normalizedTerm_idx" ON "TriggerTerm"("normalizedTerm");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_workflowRuleId_key" ON "Workflow"("workflowRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowAction_workflowId_order_key" ON "WorkflowAction"("workflowId", "order");

-- CreateIndex
CREATE INDEX "ProcessedExternalEvent_tiktokAccountId_idx" ON "ProcessedExternalEvent"("tiktokAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedExternalEvent_tiktokAccountId_source_externalId_key" ON "ProcessedExternalEvent"("tiktokAccountId", "source", "externalId");

-- CreateIndex
CREATE INDEX "AutomationSession_tiktokAccountId_participantOpenId_idx" ON "AutomationSession"("tiktokAccountId", "participantOpenId");

-- CreateIndex
CREATE INDEX "AutomationSession_workflowRuleId_idx" ON "AutomationSession"("workflowRuleId");

-- AddForeignKey
ALTER TABLE "GroupPermission" ADD CONSTRAINT "GroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPermission" ADD CONSTRAINT "GroupPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TikTokAccount" ADD CONSTRAINT "TikTokAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredVideo" ADD CONSTRAINT "MonitoredVideo_tiktokAccountId_fkey" FOREIGN KEY ("tiktokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRule" ADD CONSTRAINT "WorkflowRule_tiktokAccountId_fkey" FOREIGN KEY ("tiktokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRule" ADD CONSTRAINT "WorkflowRule_monitoredVideoId_fkey" FOREIGN KEY ("monitoredVideoId") REFERENCES "MonitoredVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerTerm" ADD CONSTRAINT "TriggerTerm_workflowRuleId_fkey" FOREIGN KEY ("workflowRuleId") REFERENCES "WorkflowRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_workflowRuleId_fkey" FOREIGN KEY ("workflowRuleId") REFERENCES "WorkflowRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedExternalEvent" ADD CONSTRAINT "ProcessedExternalEvent_tiktokAccountId_fkey" FOREIGN KEY ("tiktokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedExternalEvent" ADD CONSTRAINT "ProcessedExternalEvent_workflowRuleId_fkey" FOREIGN KEY ("workflowRuleId") REFERENCES "WorkflowRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationSession" ADD CONSTRAINT "AutomationSession_tiktokAccountId_fkey" FOREIGN KEY ("tiktokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationSession" ADD CONSTRAINT "AutomationSession_workflowRuleId_fkey" FOREIGN KEY ("workflowRuleId") REFERENCES "WorkflowRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
