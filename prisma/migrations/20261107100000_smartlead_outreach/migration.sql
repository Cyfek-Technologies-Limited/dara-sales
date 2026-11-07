CREATE TABLE "EmailAutomation" (
  "organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id") ON DELETE CASCADE,
  "encryptedApiKey" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "campaignName" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "EmailSyncJob" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "leadId" TEXT NOT NULL REFERENCES "SalesLead"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId", "email")
);
CREATE INDEX "EmailSyncJob_status_availableAt_idx" ON "EmailSyncJob"("status", "availableAt");

-- Queue in the same transaction as the lead, including unassigned leads.
CREATE FUNCTION queue_lead_email() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."stage" = 'LEAD' AND NEW."email" IS NOT NULL
    AND LENGTH(TRIM(NEW."email")) <= 254
    AND TRIM(NEW."email") ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    INSERT INTO "EmailSyncJob" ("id", "organizationId", "leadId", "email", "campaignId")
    SELECT gen_random_uuid()::text, NEW."organizationId", NEW."id", LOWER(TRIM(NEW."email")), a."campaignId"
    FROM "EmailAutomation" a WHERE a."organizationId" = NEW."organizationId" AND a."enabled" = TRUE
    ON CONFLICT ("organizationId", "email") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "SalesLead_queue_email" AFTER INSERT OR UPDATE OF "email" ON "SalesLead"
FOR EACH ROW EXECUTE FUNCTION queue_lead_email();
