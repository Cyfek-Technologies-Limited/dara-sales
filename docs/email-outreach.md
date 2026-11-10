# Email outreach with Nodemailer

Dara sends one approved initial email through each organization's own SMTP mailbox. Smartlead is no longer used. Each organization controls its own sender name, email, audience, message, and address. Unassigned prospects are supported. SMTP sending does not automate replies or follow-up sequences.

## Platform setup

1. Install dependencies with `pnpm install` and apply migrations with `pnpm db:migrate:deploy`.
2. Set server-only `SMTP_ENCRYPTION_KEY` to a random 32-byte hexadecimal value. Generate it with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Local setup generated a key without displaying it. Copy that same key securely into your deployment environment. Never expose it with NEXT_PUBLIC_. Keep it stable: changing it makes stored mailbox passwords unreadable until reconnected.
3. Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS application origin. Localhost is supported for development, but recipients cannot use a localhost unsubscribe link.
4. Run `node scripts/setup-email-cron.cjs` to prepare a random private `CRON_SECRET` in `.env` (existing non-placeholder secrets are preserved). Copy that value into the Vercel project's Production environment variables and redeploy. A local `.env` change does not update Vercel.
5. In a free cron-job.org account, create a job named **Dara email outreach**. Use URL `https://dara-sales.vercel.app/api/cron/email-outreach`, method **GET**, schedule **every minute**. In the job's advanced request headers, add `Authorization` with value `Bearer <the same CRON_SECRET>`. Keep the secret out of the URL. Save and enable the job. This one platform job processes all approved organizations; customers do not need scheduler accounts.
6. To verify only authentication first, temporarily use `https://dara-sales.vercel.app/api/cron/email-outreach?check=1` and run the provider's test action. A successful result is HTTP 200 with `{"ok":true,"mode":"connection-check"}`; it does not send email. Remove `?check=1` before enabling the actual schedule. HTTP 401 means the header/secret does not match Production; redirects or login HTML indicate deployment protection; HTTP 500 means the worker failed and deployment logs contain its code. Do not disable authentication to work around an error.
7. Check the scheduler's execution history for successful minute-by-minute requests to the URL **without** `?check=1`. Those requests process the real approved queue even when Dara is closed. This external account setup has not been completed automatically; the scheduler is not live until the job is saved and enabled there.
8. Set `EMAIL_AUTOMATION_ENABLED=false` and redeploy for an emergency stop.

Smartlead and Google mailbox OAuth variables are no longer read. Normal Google login configuration is separate. Previously active campaigns in Smartlead must be paused there; replacing Dara's integration cannot stop provider campaigns already running independently.

## Each customer organization

1. Open Email outreach and enter its sender business name, email, SMTP hostname, port 465 or 587, and SMTP/app password.
2. Click Connect business mailbox. The backend verifies SMTP authentication without sending an email. Some providers require app passwords, administrator approval, or do not allow password-based SMTP. Nodemailer does not bypass provider rules, mailbox quotas, or Google app restrictions.
3. Choose the connected sender and audience. Write the subject and message; `{{company_name}}` substitutes the prospect's business name. Enter the company's address.
4. Review and approve, then start automation. Existing matching saved prospects are included. Saving new matching prospects also starts a queue-processing attempt.
5. Pause before editing or reconnecting. Pausing prevents new dispatches; an email already handed to SMTP cannot be recalled.

There are no provider API keys or third-party campaign settings in the customer interface. Customers still need an existing mailbox that permits their intended email use. Nodemailer is a free library, not an email hosting service.

## Delivery and safeguards

- Credentials are AES-256-GCM encrypted with organization-bound authenticated data and never returned in API responses. SMTP uses TLS with certificate validation. Only public IPv4 SMTP destinations on ports 465/587 are allowed; the resolved address is pinned to avoid DNS rebinding.
- SMTP login verifies account access, not ownership of arbitrary aliases. The sender address is restricted to the authenticated email. The provider must authorize sending from it.
- A worker processes at most one email per run, with per-organization serialization, at least one minute between attempts, and at most 30 accepted messages per rolling 24 hours. Increase worker capacity deliberately for production volume.
- Organization/email uniqueness prevents repeat initial emails, even if the message changes. Historical Smartlead imports are retained as imports and are not resent. Never-imported cancelled queue entries can join the approved SMTP audience.
- Every email includes the organization's name/address and an unsubscribe link. The link opens a confirmation page; POST supports one-click unsubscribe. Suppression is organization-specific and checked before dispatch.
- SENT means the SMTP server accepted the email; it does not establish inbox delivery or a reply. UNKNOWN means a send or process interruption could have occurred after acceptance. These are never automatically retried. Check the mailbox before any manual follow-up. Only failures before dispatch can be retried in Dara.
- Bounce webhooks, delivery/open tracking, automatic replies, and multi-step sequences are not implemented. Provider bounce handling and deliverability configuration remain necessary for production.
- No real email was sent during implementation. Configure a permitted mailbox and scheduler before activation.

## AI email drafts

In Your message and audience, choose an industry and use Generate subject and email. The business description is prefilled from the signed-in admin's saved AI Prospecting preferences, scoped to the current organization. It can be refined for the current draft. Website-only inputs must first be analyzed in AI Prospecting so a business summary is available.

The backend generates a concise, benefit-focused email using the existing server-only OPENAI_API_KEY and OPENAI_PROSPECTING_MODEL configuration. It sends only the organization name, offering description and selected industry to the AI provider, not mailbox credentials or prospect contact details. Generated output uses a strict subject/message schema and is validated before returning. Generation requests are serialized per organization.

Review the preview and choose Use this draft to replace the editable subject and message fields. Regenerate or discard without changing an existing message. Applying a draft clears approval; saving and starting outreach remain separate actions. AI drafts are not sent automatically and should be checked for factual accuracy. Description refinements in this card guide the current generation; update AI Prospecting to change the saved business description.

## Live sending and company contacts

Email outreach now includes a live monitor above the setup form. Clicking Start sending emails shows a preparing state and scrolls to it. The approved audience is queued before activation returns. Activity is fetched about every three seconds while the page is visible, including the current and next recipient, company, email, phone, status, error reason and timestamps. Counts and progress are scoped to the current message configuration, including all its recipients rather than just the displayed page. The progress bar measures processed recipients, not inbox delivery. Search, status filters and pagination help inspect individual recipients.

The visible monitor requests processing of the already-approved queue every 15 seconds; server-side serialization, one-minute gaps, daily caps and suppression checks remain authoritative. Closing the page still requires the protected recurring scheduler for background progress. The UI explains this dependency and shows waiting slots and the rolling daily limit. Mail-server acceptance is clearly distinguished from inbox delivery. Explicit SMTP rejections are marked failed; ambiguous sends remain unconfirmed and are never automatically retried.

Company contacts lists saved Prospect-stage records in the selected industry, with contact person, company, job title, department, email and phone. Unsubscribed and missing-email contacts are labeled. New AI Prospecting searches request named work contacts explicitly published on official company pages, alongside source links. Roles and departments persist with the saved prospect. Direct contacts are not guaranteed: general business email/phone may be used, and missing fields remain not listed. Existing saved prospects are not automatically researched or enriched by this migration.

No real email was sent to exercise the live monitor during implementation.

## Website contact extraction

Prospecting discovery now follows each sourced business website and up to three official contact links or common contact-page paths. It reads HTML, mailto/tel links, visible text, Organization/LocalBusiness JSON-LD contacts, common HTML entities and email obfuscation. Contact extraction has a per-site deadline, bounded concurrency and a bounded response size. It uses pinned public IPv4 DNS addresses and validates same-business-site redirects before connecting. Pages requiring client-side rendering, inaccessible sites, bot challenges, unsupported encodings or timeouts can still prevent extraction; those cases are not labeled as proof that contacts do not exist.

Email and phone have separate source URLs so data found on different official pages is retained when saving a prospect. Contact requirements are checked after extraction. Source-backed search contacts can be retained when direct page access fails. Existing saved prospects are not automatically updated; run discovery again for freshly extracted results. These changes require deployment, but no database migration.

## Queued without sending

Queued is not evidence of delivery: it means no sending attempt has been recorded for that job. The authenticated process action now waits for the worker outcome instead of returning success before a background callback runs. Its errors are returned to the live view and attached to queued rows when possible. The live view polls independently of the SMTP request, so SENDING remains visible while the network operation is running.

Worker claims use short transactions with an organization row lock and an atomic job status update. They do not depend on session advisory locks surviving correctly across serverless invocations or pooled database connections. Active SENDING leases and rate limits prevent overlapping sends. SMTP DNS lookup is time bounded, and unreadable encrypted credentials produce a specific reconnect instruction.

For read-only diagnostics, run `node scripts/diagnose-outreach.cjs`. It prints readiness flags, counts, timestamps, worker eligibility and lock counts, never mailbox passwords or prospect addresses. SQL planning uses EXPLAIN without ANALYZE and does not execute inserts or updates. It does not send emails. A production SMTP delivery must still be confirmed by its resulting SENT/FAILED/UNKNOWN status after deployment.

### Duplicate recipient error (21000)

The queue backfill deduplicates source prospects by organization and lowercased, trimmed email before generating job IDs or upserting. PostgreSQL rejects an ON CONFLICT DO UPDATE operation that targets the same recipient more than once in a single statement. Distinct prospect IDs or newly generated job IDs do not solve that conflict because the unique key is organization/email. Selection is deterministic (oldest eligible prospect, then ID); separate organizations retain independent queues. Existing attempted, sent or active jobs are not reset. Only cancelled, never-attempted jobs can be requeued, with their selected eligible prospect and availability refreshed. No database migration or prospect deletion is required.

## Pipeline terminology

The interface calls outreach contacts **Prospects** and contacts who have responded positively **Leads**. The next stage remains **Client**. New researched and manually saved contacts appear in the prospects pipeline; recording a positive response means advancing them to Lead in the stage selector. This wording is shared by the dashboard, analytics, industry metrics, team views, prospect forms and email outreach.

For compatibility with existing records and automatic email eligibility, persisted stage code `LEAD` is displayed as Prospect, and persisted `PROSPECT` is displayed as Lead. Use `salesStageLabel` for dynamic stage labels. Existing database identifiers and API routes retain their technical names. No migration or reassignment of existing records is needed.
