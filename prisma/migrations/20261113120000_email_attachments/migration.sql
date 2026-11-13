ALTER TABLE "EmailAutomation" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]'::jsonb;
