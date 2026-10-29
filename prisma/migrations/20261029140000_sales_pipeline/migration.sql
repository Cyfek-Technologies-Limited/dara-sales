CREATE TABLE "SalesLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "source" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'LEAD',
    "advertiserSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "campaignSuccessfulAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesOutreach" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "platform" TEXT,
    "note" TEXT,
    "outcome" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesOutreach_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalesLead_organizationId_ownerId_stage_idx" ON "SalesLead"("organizationId", "ownerId", "stage");
CREATE INDEX "SalesLead_ownerId_createdAt_idx" ON "SalesLead"("ownerId", "createdAt");
CREATE INDEX "SalesOutreach_organizationId_occurredAt_idx" ON "SalesOutreach"("organizationId", "occurredAt");
CREATE INDEX "SalesOutreach_ownerId_occurredAt_idx" ON "SalesOutreach"("ownerId", "occurredAt");
CREATE INDEX "SalesOutreach_leadId_occurredAt_idx" ON "SalesOutreach"("leadId", "occurredAt");

ALTER TABLE "SalesLead" ADD CONSTRAINT "SalesLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOutreach" ADD CONSTRAINT "SalesOutreach_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesOutreach" ADD CONSTRAINT "SalesOutreach_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "SalesLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
