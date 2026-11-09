// Prepare the private platform secret without printing it to terminal output.
const fs = require('node:fs');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const envFile = '.env';
let contents = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const current = dotenv.parse(contents).CRON_SECRET || '';
if (current.length < 32 || /^(an_independent_random_secret|changeme|your[_-].*|replace[_-].*)$/i.test(current)) {
  const entry = `CRON_SECRET=${crypto.randomBytes(32).toString('hex')}`;
  const pattern = /^CRON_SECRET\s*=.*$/m;
  contents = pattern.test(contents) ? contents.replace(pattern, () => entry) : `${contents.trimEnd()}\n${entry}\n`;
  fs.writeFileSync(envFile, contents);
  console.log('A random scheduler secret was saved in .env. Its value was not printed.');
} else console.log('The existing scheduler secret was preserved. Its value was not printed.');
console.log('Copy CRON_SECRET securely into Vercel Production environment variables, then redeploy.');
console.log('Scheduler URL: https://dara-sales.vercel.app/api/cron/email-outreach');
console.log('Schedule: every minute. HTTP method: GET. Header: Authorization: Bearer <CRON_SECRET>.');
console.log('Use the same URL with ?check=1 to verify authentication without sending an email.');
