import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { GoogleAuth } from 'google-auth-library';

async function main() {
  const PROJECT_ID   = process.env.FIREBASE_ADMIN_PROJECT_ID!;
  const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
  const PRIVATE_KEY  = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const auth = new GoogleAuth({
    credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const token  = await client.getAccessToken();
  const base   = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`;
  const headers = {
    Authorization: `Bearer ${token.token}`,
    'Content-Type': 'application/json',
  };

  // Fetch current config to get existing authorized domains
  const current = await fetch(base, { headers }).then(r => r.json()) as {
    authorizedDomains?: string[];
  };

  const existing = current.authorizedDomains ?? [];
  console.log('Current authorized domains:', existing);

  const toAdd = [
    'que-up1-git-main-hlomla-magopenis-projects.vercel.app',
    'que-up1.vercel.app',  // root Vercel domain, in case it exists
  ];

  const merged = Array.from(new Set([...existing, ...toAdd]));
  console.log('Updated authorized domains:', merged);

  const res = await fetch(`${base}?updateMask=authorizedDomains`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ authorizedDomains: merged }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH failed: ${err}`);
  }

  console.log('\n✅  Authorized domains updated successfully.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
