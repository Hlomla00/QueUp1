/**
 * QueUp — Integration Test Suite
 * ================================
 * 4 automated end-to-end tests for the MICT SETA National Finals demo.
 *
 * Tests:
 *  1. Ticket Creation         — POST /api/ticket returns 201 + valid ticket
 *  2. TFLite Value            — ticket contains tfliteWaitPrediction > 0
 *  3. Branch Full → Redirect  — POST /api/ticket returns 409, then
 *                               POST /api/redirect returns a valid alternative
 *  4. 3D Map Data Integrity   — GET /api/branches returns branches with
 *                               valid coordinates and currentQueue values
 *
 * Run: npx tsx tests/test_integration.ts
 * Or:  npx ts-node tests/test_integration.ts
 */

export {};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9002';

// ── Minimal test runner ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results: { name: string; status: 'PASS' | 'FAIL'; error?: string; durationMs: number }[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    console.log(`  ✅  ${name} (${ms}ms)`);
    results.push({ name, status: 'PASS', durationMs: ms });
    passed++;
  } catch (err: unknown) {
    const ms = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ❌  ${name} (${ms}ms)\n      ${message}`);
    results.push({ name, status: 'FAIL', error: message, durationMs: ms });
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Ticket Creation
// ─────────────────────────────────────────────────────────────────────────────
await test('Test 1 — Ticket creation returns 201 with valid ticket', async () => {
  // First, get a real branch ID
  const { status: bStatus, data: bData } = await apiGet('/api/branches');
  assert(bStatus === 200, `GET /api/branches returned ${bStatus}`);
  assert(Array.isArray(bData.branches) && bData.branches.length > 0, 'No branches returned');

  // Pick a non-full branch
  const branch = (bData.branches as Array<{ id: string; congestionLevel: string; name: string }>)
    .find((b) => b.congestionLevel !== 'FULL');
  assert(!!branch, 'No available (non-full) branches found');

  const { status, data } = await apiPost('/api/ticket', {
    branchId: branch!.id,
    citizenName: 'Nomsa Dlamini',
    citizenPhone: '+27812345678',
    serviceType: 'smart_id',
    serviceLabel: 'Smart ID Card',
    source: 'web',
  });

  assert(status === 201, `Expected 201, got ${status}. Body: ${JSON.stringify(data)}`);
  assert(data.success === true, 'Response missing success: true');
  assert(typeof data.ticket?.id === 'string', 'Missing ticket.id');
  assert(typeof data.ticket?.ticketNumber === 'string', 'Missing ticket.ticketNumber');
  assert(data.ticket?.status === 'WAITING', `Expected WAITING, got ${data.ticket?.status}`);
  assert(data.ticket?.citizenName === 'Nomsa Dlamini', 'Citizen name mismatch');
  assert(data.intelligence?.position >= 1, 'Queue position must be >= 1');
  assert(data.intelligence?.estimatedWaitMinutes > 0, 'estimatedWaitMinutes must be > 0');

  console.log(`      Ticket: ${data.ticket.ticketNumber} | Position: ${data.intelligence.position} | Wait: ${data.intelligence.estimatedWaitMinutes}min`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: TFLite Value in Ticket
// ─────────────────────────────────────────────────────────────────────────────
await test('Test 2 — TFLite wait prediction is included and > 0', async () => {
  const { data: bData } = await apiGet('/api/branches');
  const branch = (bData.branches as Array<{ id: string; congestionLevel: string }>)
    .find((b) => b.congestionLevel !== 'FULL');
  assert(!!branch, 'No available branch');

  const { status, data } = await apiPost('/api/ticket', {
    branchId: branch!.id,
    citizenName: 'Thabo Nkosi',
    citizenPhone: '+27731234567',
    serviceType: 'passport',
    serviceLabel: 'Passport',
    source: 'kiosk',
  });

  assert(status === 201, `Expected 201, got ${status}`);

  const tflite = data.ticket?.tfliteWaitPrediction;
  assert(typeof tflite === 'number', `tfliteWaitPrediction must be a number, got ${typeof tflite}`);
  assert(tflite > 0, `tfliteWaitPrediction must be > 0, got ${tflite}`);

  // TFLite prediction should be within 50% of the intelligence estimate
  const intel = data.intelligence?.estimatedWaitMinutes ?? 0;
  const ratio = tflite / intel;
  assert(ratio > 0.5 && ratio < 2.0, `TFLite (${tflite}) vs Intel (${intel}) ratio ${ratio.toFixed(2)} out of expected range`);

  console.log(`      TFLite: ${tflite}min | Intelligence: ${intel}min | Ratio: ${ratio.toFixed(2)}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Branch Full → 409 → Claude Redirect
// ─────────────────────────────────────────────────────────────────────────────
await test('Test 3 — Full branch returns 409, Claude redirect provides alternative', async () => {
  // Find a FULL branch
  const { data: bData } = await apiGet('/api/branches');
  const fullBranch = (bData.branches as Array<{ id: string; congestionLevel: string; name: string }>)
    .find((b) => b.congestionLevel === 'FULL');

  assert(!!fullBranch, 'No FULL branch found — seed a full branch or set capacity=0 for testing');

  // Attempt to create ticket at full branch
  const { status, data } = await apiPost('/api/ticket', {
    branchId: fullBranch!.id,
    citizenName: 'Lindiwe Mokoena',
    citizenPhone: '+27601234567',
    serviceType: 'smart_id',
    serviceLabel: 'Smart ID Card',
  });

  assert(status === 409, `Expected 409 for full branch, got ${status}`);
  assert(data.error === 'BRANCH_FULL', `Expected BRANCH_FULL error, got ${data.error}`);
  console.log(`      409 confirmed for: ${fullBranch!.name}`);

  // Now call /api/redirect
  const { status: rStatus, data: rData } = await apiPost('/api/redirect', {
    branchId: fullBranch!.id,
    serviceType: 'smart_id',
    citizenLocation: { lat: -33.9249, lng: 18.4241 }, // Cape Town CBD
  });

  assert(rStatus === 200, `Expected 200 from /api/redirect, got ${rStatus}`);
  assert(rData.success === true, 'Redirect response missing success');
  assert(typeof rData.recommended?.id === 'string', 'Missing recommended branch id');
  assert(typeof rData.recommended?.name === 'string', 'Missing recommended branch name');
  assert(typeof rData.reasoning === 'string' && rData.reasoning.length > 10, 'Claude reasoning missing or too short');
  assert(rData.recommended?.id !== fullBranch!.id, 'Redirect cannot point to the same full branch');

  console.log(`      Redirected to: ${rData.recommended.name} (${rData.recommended.distanceKm?.toFixed(1)}km away)`);
  console.log(`      Claude: "${rData.reasoning.substring(0, 80)}..."`);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: 3D Map Data Integrity
// ─────────────────────────────────────────────────────────────────────────────
await test('Test 4 — 3D map data: branches have valid coordinates and queue values', async () => {
  const { status, data } = await apiGet('/api/branches');

  assert(status === 200, `GET /api/branches returned ${status}`);
  assert(Array.isArray(data.branches), 'branches must be an array');
  assert(data.branches.length >= 3, `Expected >= 3 branches for 3D map, got ${data.branches.length}`);

  let invalidCoords = 0;
  let invalidQueue = 0;
  let capeTownBranches = 0;

  for (const b of data.branches) {
    // Validate coordinates (Western Cape bounding box roughly)
    const { lat, lng } = b.coordinates ?? {};
    if (
      typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < -35 || lat > -32 || lng < 17 || lng > 20
    ) {
      invalidCoords++;
    }

    // Validate queue values
    if (
      typeof b.currentQueue !== 'number' || b.currentQueue < 0 ||
      typeof b.capacity !== 'number' || b.capacity <= 0 ||
      b.currentQueue > b.capacity * 1.05 // allow slight overshoot
    ) {
      invalidQueue++;
    }

    if (b.city === 'Cape Town') capeTownBranches++;
  }

  assert(invalidCoords === 0, `${invalidCoords} branches have invalid Cape Town coordinates`);
  assert(invalidQueue === 0, `${invalidQueue} branches have invalid queue/capacity values`);
  assert(capeTownBranches >= 3, `Expected >= 3 Cape Town branches for 3D map, got ${capeTownBranches}`);

  // Validate analytics endpoint for first branch
  const firstBranch = data.branches[0];
  const { status: aStatus, data: aData } = await apiGet(`/api/analytics/${firstBranch.id}`);
  assert(aStatus === 200, `GET /api/analytics/${firstBranch.id} returned ${aStatus}`);
  assert(typeof aData.live?.currentQueue === 'number', 'Missing live.currentQueue in analytics');
  assert(typeof aData.live?.loadPercent === 'number', 'Missing live.loadPercent');

  console.log(`      ${data.branches.length} branches validated | ${capeTownBranches} in Cape Town`);
  console.log(`      Analytics live queue: ${aData.live.currentQueue} (${aData.live.loadPercent}% load)`);
});

// ── Summary ───────────────────────────────────────────────────────────────────
const totalMs = results.reduce((s, r) => s + r.durationMs, 0);
console.log('\n' + '='.repeat(60));
console.log('  TEST RESULTS SUMMARY');
console.log('='.repeat(60));
results.forEach((r, i) => {
  console.log(`  ${r.status === 'PASS' ? '✅' : '❌'}  Test ${i + 1}: ${r.name.replace(/Test \d+ — /, '')} (${r.durationMs}ms)`);
  if (r.error) console.log(`       Error: ${r.error}`);
});
console.log(`\n  Passed: ${passed}/${passed + failed}  |  Total time: ${totalMs}ms`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error(`\n  ${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log('\n  All tests passed. QueUp is demo-ready! 🎉');
  process.exit(0);
}
