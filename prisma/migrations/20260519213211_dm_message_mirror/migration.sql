-- CreateEnum
CREATE TYPE "DmMirrorDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "DmMessageMirror" (
    "id" TEXT NOT NULL,
    "tiktokAccountId" TEXT NOT NULL,
    "externalConversationId" VARCHAR(512) NOT NULL,
    "externalMessageId" VARCHAR(512) NOT NULL,
    "direction" "DmMirrorDirection" NOT NULL DEFAULT 'INBOUND',
    "body" TEXT NOT NULL,
    "senderOpenId" VARCHAR(256),
    "senderHandle" VARCHAR(256),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessageMirror_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmMessageMirror_tiktokAccountId_occurredAt_idx" ON "DmMessageMirror"("tiktokAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "DmMessageMirror_tiktokAccountId_externalConversationId_idx" ON "DmMessageMirror"("tiktokAccountId", "externalConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "DmMessageMirror_tiktokAccountId_externalMessageId_key" ON "DmMessageMirror"("tiktokAccountId", "externalMessageId");

-- AddForeignKey
ALTER TABLE "DmMessageMirror" ADD CONSTRAINT "DmMessageMirror_tiktokAccountId_fkey" FOREIGN KEY ("tiktokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
