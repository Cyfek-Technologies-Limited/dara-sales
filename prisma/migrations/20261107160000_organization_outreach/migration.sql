ALTER TABLE "EmailAutomation"
  ALTER COLUMN "campaignId" SET DEFAULT '',
  ALTER COLUMN "encryptedApiKey" SET DEFAULT '',
  ADD COLUMN "subject" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "message" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "companyAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "industryId" TEXT,
  ADD COLUMN "senderId" TEXT,
  ADD COLUMN "legacyCampaignId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT';

-- Existing shared campaigns must not be adopted by unrelated organizations.
UPDATE "EmailAutomation" SET "enabled" = FALSE, "status" = 'DRAFT', "legacyCampaignId" = NULLIF("campaignId", ''), "campaignId" = '';
CREATE UNIQUE INDEX "EmailAutomation_campaignId_key" ON "EmailAutomation"("campaignId") WHERE "campaignId" <> '';

CREATE TABLE "OrganizationEmailSender" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "providerAccountId" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OrganizationEmailSender_organizationId_idx" ON "OrganizationEmailSender"("organizationId");
ALTER TABLE "EmailAutomation" ADD CONSTRAINT "EmailAutomation_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "OrganizationEmailSender"("id") ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION queue_lead_email() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."stage" = 'LEAD' AND NEW."email" IS NOT NULL
    AND LENGTH(TRIM(NEW."email")) <= 254
    AND TRIM(NEW."email") ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    INSERT INTO "EmailSyncJob" ("id", "organizationId", "leadId", "email", "campaignId")
    SELECT gen_random_uuid()::text, NEW."organizationId", NEW."id", LOWER(TRIM(NEW."email")), a."campaignId"
    FROM "EmailAutomation" a
    JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
    LEFT JOIN "IndustryCategory" c ON c."id" = NEW."industryCategoryId"
    WHERE a."organizationId" = NEW."organizationId" AND a."enabled" = TRUE AND a."status" = 'READY'
      AND a."campaignId" <> '' AND (a."industryId" IS NULL OR c."industryId" = a."industryId")
    ON CONFLICT ("organizationId", "email") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
