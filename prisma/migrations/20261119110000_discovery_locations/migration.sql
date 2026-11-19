ALTER TABLE "ProspectDiscovery" ADD COLUMN "locations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "ProspectDiscovery" SET "locations"=ARRAY["location"] WHERE trim("location")<>'';
