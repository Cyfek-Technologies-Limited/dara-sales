ALTER TABLE "SalesLead" DROP CONSTRAINT "SalesLead_contactStatus_check";
ALTER TABLE "SalesLead" ADD CONSTRAINT "SalesLead_contactStatus_check"
  CHECK ("contactStatus" IN ('PROSPECT','CONTACTED','ACCEPTED','REJECTED','RESPONSE'));
