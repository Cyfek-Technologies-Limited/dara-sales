CREATE TABLE "IndustryCategory" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndustryCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SalesLead" ADD COLUMN "industryCategoryId" TEXT;

CREATE UNIQUE INDEX "IndustryCategory_industryId_name_key" ON "IndustryCategory"("industryId", "name");
CREATE INDEX "IndustryCategory_industryId_idx" ON "IndustryCategory"("industryId");
CREATE INDEX "SalesLead_industryCategoryId_stage_idx" ON "SalesLead"("industryCategoryId", "stage");

ALTER TABLE "IndustryCategory" ADD CONSTRAINT "IndustryCategory_industryId_fkey"
    FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesLead" ADD CONSTRAINT "SalesLead_industryCategoryId_fkey"
    FOREIGN KEY ("industryCategoryId") REFERENCES "IndustryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
