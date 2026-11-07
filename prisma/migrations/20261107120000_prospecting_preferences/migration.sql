CREATE TABLE "ProspectingPreference" (
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "authUserId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "form" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId", "authUserId")
);
