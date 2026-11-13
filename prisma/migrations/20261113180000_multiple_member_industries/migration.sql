ALTER TABLE "OrganizationMember" ADD COLUMN "industryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "OrganizationMember" SET "industryIds" = ARRAY["industryId"] WHERE "industryId" IS NOT NULL;
