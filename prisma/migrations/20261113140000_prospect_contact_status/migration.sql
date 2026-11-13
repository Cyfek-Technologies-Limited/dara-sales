ALTER TABLE "SalesLead" ADD COLUMN "contactStatus" TEXT NOT NULL DEFAULT 'PROSPECT';
ALTER TABLE "SalesLead" ADD COLUMN "responseText" TEXT;
UPDATE "SalesLead" l SET "contactStatus" = 'CONTACTED'
WHERE EXISTS (SELECT 1 FROM "SalesOutreach" s WHERE s."leadId" = l."id")
   OR EXISTS (SELECT 1 FROM "EmailSyncJob" j WHERE j."leadId" = l."id" AND j."status" = 'SENT');
UPDATE "SalesLead" SET "contactStatus" = 'RESPONSE' WHERE "stage" IN ('PROSPECT','CLIENT','ONBOARDED','CAMPAIGN_SUCCESSFUL');
ALTER TABLE "SalesLead" ADD CONSTRAINT "SalesLead_contactStatus_check" CHECK ("contactStatus" IN ('PROSPECT','CONTACTED','RESPONSE'));
