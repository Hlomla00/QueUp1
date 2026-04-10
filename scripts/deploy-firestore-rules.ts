/**
 * scripts/deploy-firestore-rules.ts
 * Deploys firestore.rules to the live project using the service account
 * credentials already in .env.local — no firebase login required.
 *
 * Run: npx tsx scripts/deploy-firestore-rules.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { readFileSync } from 'fs';
config({ path: resolve(process.cwd(), '.env.local') });

import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID!;
const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
const PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n');

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error('❌  Missing Firebase Admin credentials in .env.local');
  process.exit(1);
}

const rulesSource = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

async function deploy() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  // 1 — Create a new ruleset
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files: [{ name: 'firestore.rules', content: rulesSource }],
        },
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create ruleset: ${err}`);
  }

  const ruleset = (await createRes.json()) as { name: string };
  console.log(`  ✓  Ruleset created: ${ruleset.name}`);

  // 2 — Update the Cloud Firestore release to point at the new ruleset
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName: ruleset.name,
        },
      }),
    }
  );

  if (!releaseRes.ok) {
    const err = await releaseRes.text();
    throw new Error(`Failed to update release: ${err}`);
  }

  console.log('  ✓  Release updated — rules are live');
}

console.log('\n🔒  Deploying Firestore security rules…\n');
deploy()
  .then(() => {
    console.log('\n✅  Firestore rules deployed successfully.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌  Deploy failed:', err.message);
    process.exit(1);
  });
