ALTER TABLE "OrganizationEmailSender" ADD COLUMN "googleSubject" TEXT UNIQUE;

CREATE TABLE "MailboxOAuthState" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "authUserId" TEXT NOT NULL,
  "browserHash" TEXT NOT NULL,
  "codeVerifier" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MailboxOAuthState_expiresAt_idx" ON "MailboxOAuthState"("expiresAt");
