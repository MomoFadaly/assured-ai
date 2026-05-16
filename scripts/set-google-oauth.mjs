#!/usr/bin/env node
/**
 * Helper: set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in Vercel for all
 * three environments (production, preview, development), then redeploy.
 *
 * Usage:
 *   node scripts/set-google-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * Idempotent — uses `vercel env add ... --force` so re-running rotates
 * the credentials cleanly.
 */

import { execFileSync } from 'node:child_process';

const [clientId, clientSecret] = process.argv.slice(2);

if (!clientId || !clientSecret) {
  console.error(
    'Usage: node scripts/set-google-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>',
  );
  console.error('');
  console.error('Get these from:');
  console.error('  https://console.cloud.google.com/apis/credentials');
  console.error('  → Create OAuth client → Web application');
  console.error('  → Authorized JS origins:   https://assuredai.online');
  console.error('  → Authorized redirect URI: https://assuredai.online/api/auth/callback/google');
  process.exit(1);
}

const envs = ['production', 'preview', 'development'];

function setEnv(key, value, env) {
  console.log(`[vercel] set ${key} (${env})`);
  // `vercel env add NAME ENV --force --sensitive` reads value from stdin.
  execFileSync('vercel', ['env', 'add', key, env, '--force', '--sensitive'], {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

for (const env of envs) {
  setEnv('GOOGLE_CLIENT_ID', clientId, env);
  setEnv('GOOGLE_CLIENT_SECRET', clientSecret, env);
}

console.log('');
console.log('[vercel] env vars set. Triggering production redeploy…');
execFileSync('vercel', ['deploy', '--prod', '--yes'], { stdio: 'inherit' });
console.log('');
console.log('Done. Test at: https://assuredai.online/sign-in');
console.log('  The "Continue with Google" button should now appear.');
