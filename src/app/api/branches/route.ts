/**
 * GET /api/branches
 * Returns all branches, optionally filtered by city or department.
 * Supports ?seed=true to populate Firestore with demo data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { COLLECTIONS, Branch, SEED_BRANCHES } from '@/lib/firestore-schema';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const department = searchParams.get('department');
    const seed = searchParams.get('seed') === 'true';

    // ── Optional: seed Firestore with demo branches ───────────────────────────
    if (seed) {
      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();
      for (const b of SEED_BRANCHES) {
        const ref = db.collection(COLLECTIONS.BRANCHES).doc();
        batch.set(ref, { ...b, createdAt: now, updatedAt: now });
      }
      await batch.commit();
      return NextResponse.json({ seeded: SEED_BRANCHES.length });
    }

    // ── Query ─────────────────────────────────────────────────────────────────
    let query = db.collection(COLLECTIONS.BRANCHES) as FirebaseFirestore.Query;

    if (city) query = query.where('city', '==', city);
    if (department) query = query.where('department', '==', department);

    const snap = await query.orderBy('name').get();
    const branches: Branch[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Branch, 'id'>),
    }));

    return NextResponse.json({ branches, count: branches.length });
  } catch (err) {
    console.error('[GET /api/branches]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
