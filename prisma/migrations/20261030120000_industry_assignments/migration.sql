CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrganizationMember" ADD COLUMN "industryId" TEXT;

CREATE UNIQUE INDEX "Industry_organizationId_name_key" ON "Industry"("organizationId", "name");
CREATE INDEX "Industry_organizationId_idx" ON "Industry"("organizationId");

ALTER TABLE "Industry" ADD CONSTRAINT "Industry_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_industryId_fkey"
    FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
