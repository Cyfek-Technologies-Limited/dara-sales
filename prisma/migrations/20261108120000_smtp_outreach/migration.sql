ALTER TABLE "OrganizationEmailSender" ADD COLUMN "smtpHost" TEXT,
 ADD COLUMN "smtpPort" INTEGER, ADD COLUMN "smtpUsername" TEXT,
 ADD COLUMN "smtpPassword" TEXT, ADD COLUMN "senderName" TEXT;
ALTER TABLE "EmailSyncJob" ADD COLUMN "unsubscribeToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
 ADD COLUMN "sentAt" TIMESTAMP(3), ADD COLUMN "messageId" TEXT;
CREATE UNIQUE INDEX "EmailSyncJob_unsubscribeToken_key" ON "EmailSyncJob"("unsubscribeToken");
CREATE TABLE "EmailSuppression" (
 "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
 "email" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("organizationId", "email")
);
UPDATE "EmailAutomation" SET "enabled" = FALSE, "status" = 'DRAFT',
 "legacyCampaignId" = NULLIF("campaignId", ''), "campaignId" = '';
UPDATE "EmailSyncJob" SET "status" = 'CANCELLED', "lastError" = 'Previous provider queue retired.'
 WHERE "status" IN ('QUEUED','FAILED','SYNCING');
