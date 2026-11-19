CREATE TABLE "ProspectDiscovery" (
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "authUserId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "location" TEXT NOT NULL DEFAULT '',
  "targetContact" TEXT NOT NULL DEFAULT '',
  "dailyTarget" INTEGER NOT NULL DEFAULT 50 CHECK ("dailyTarget" IN (50,100)),
  "day" DATE NOT NULL DEFAULT CURRENT_DATE,
  "addedToday" INTEGER NOT NULL DEFAULT 0,
  "runsToday" INTEGER NOT NULL DEFAULT 0,
  "totalAdded" INTEGER NOT NULL DEFAULT 0,
  "categoryCursor" INTEGER NOT NULL DEFAULT 0,
  "nextRunAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lockedUntil" TIMESTAMPTZ,
  "leaseId" TEXT,
  "lastRunAt" TIMESTAMPTZ,
  "lastMessage" TEXT,
  PRIMARY KEY ("organizationId", "authUserId")
);
CREATE INDEX "ProspectDiscovery_due" ON "ProspectDiscovery" ("enabled", "nextRunAt");
