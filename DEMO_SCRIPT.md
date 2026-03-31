# QueUp — MICT SETA National Finals Demo Script
**5.5-Minute Rehearsal Guide**

---

## Pre-Demo Setup (10 min before)
- [ ] Browser open on `http://localhost:9002` (or deployed URL)
- [ ] Android tablet kiosk app running — screen on, full-screen
- [ ] Thermal printer connected via USB-OTG and powered on
- [ ] Second browser tab open on `/branch/[bellville-id]` (3D map)
- [ ] Run: `npx tsx tests/test_integration.ts` → all 4 PASS
- [ ] Seed Firestore: `GET /api/branches?seed=true` (first run only)
- [ ] Confirm Firebase console shows 5 branches in `branches` collection

---

## PHASE 1 — Normal Queue Flow (0:00 – 3:00)

### 0:00 — Introduction (30s)
> "South Africans spend on average 4.2 hours in a government queue. QueUp digitises
> the queue — citizens get a ticket, track their position live, and only arrive when
> it's their turn."

Click: **Home page** (`/`)
- Point out: hero section, department scroller, stats (1.2M hours saved, 450 branches)

---

### 0:30 — Join the Queue via Web (60s)
Click: **"Join a Queue"** → `/join/flow`

1. **Step 1** — Select branch: Home Affairs Bellville
2. **Step 2** — Pick service: Smart ID Card
3. **Step 3** — Enter phone: +27 81 234 5678, Name: Nomsa Dlamini
4. Click **"Get My Ticket"**
   - *API call: POST /api/ticket*
   - Show the ticket card: ticket number (e.g. HA-024), est. wait, TFLite prediction
5. Click **"Track Live Position"**

**Talking point:**
> "The Queue Intelligence Engine combines real-time queue size with our TFLite edge AI
> model — the same model running offline on the Android kiosk — to give an accurate,
> personalised wait estimate."

---

### 1:30 — 3D Live Branch Map (60s)
Navigate to the **3D Map page** (or show the `ThreeJsMap` component embedded in dashboard)

- Point out: Cape Town ground plane, 5 branch pillars
- Zoom/rotate to show Bellville (lime pillar — LOW), CBD (red pillar — FULL)
- Click on a pillar → popup shows queue size, wait time, congestion
- Watch: as tickets are issued, pillar heights increase in real time

**Talking point:**
> "Branch managers get a bird's-eye view of congestion across all branches. Pillar height
> equals queue size divided by 10 — a full branch glows red with a pulsing halo."

---

### 2:30 — Android Kiosk (30s)
Switch to the **Android tablet**

1. Tap **"Smart ID Card"** on the service grid
2. Enter phone number
3. Tap **"Get My Ticket"**
   - TFLite runs offline → predicted wait appears
   - Ticket prints from thermal printer
4. Show the printed slip

**Talking point:**
> "No internet? No problem. TFLite runs completely on-device. Tickets sync to Firestore
> when connectivity returns, using Room DB as the offline cache."

---

## PHASE 2 — Branch Full + Claude Redirect (3:00 – 5:30)

### 3:00 — Branch Full Scenario (90s)
Navigate back to **web app** → Join Queue

1. Select **Home Affairs Cape Town CBD** (pre-configured as FULL in seed data)
2. Enter citizen details, click **"Get My Ticket"**
   - API returns **HTTP 409** — `BRANCH_FULL`
   - **BranchFullModal** slides in automatically

**Talking point:**
> "The system returns a 409 status. On the front end, our BranchFullModal activates —
> and immediately calls our Claude claude-sonnet-4-6 agentic redirect engine."

3. Show the modal loading state: *"Claude is finding the best alternative..."*
4. Recommendation appears:
   - Claude's reasoning (read it out)
   - Recommended branch name, distance, wait time
   - Alternative branches listed below

**Talking point:**
> "Claude uses Haversine distance to rank nearby branches, considers their live queue
> sizes, and reasons in natural language to pick the optimal redirect for this citizen."

5. Click **"Join Queue at [Recommended Branch]"**
   - Redirected to join flow for the new branch
   - Ticket issued successfully with 201

---

### 4:30 — Analytics & Recommendations (30s)
Open browser: `GET /api/analytics/[bellville-id]` (show JSON in browser)
Or show it via the branch page → analytics section

**Talking point:**
> "Every ticket, every service time, every queue spike is recorded. This feeds back into
> our ML training pipeline and Claude's recommendation context."

---

### 5:00 — Closing (30s)
Back to home page

> "QueUp gives citizens back their time. Scan a QR, get a ticket, track your position —
> and only arrive when it's your turn. For government, it means real-time visibility,
> predictive capacity planning, and AI-powered citizen routing. Thank you."

---

## FALLBACK INSTRUCTIONS

| Problem | Solution |
|---|---|
| Firebase not connected | Use mock data: set `MOCK_MODE=true` in `.env.local` |
| Android printer offline | Show printed ticket photo on screen |
| TFLite model missing | WaitPredictor heuristic fallback activates (12min × queue) |
| Claude API down | `/api/redirect` falls back to Haversine closest branch |
| 3D map blank | Check `NEXT_PUBLIC_FIREBASE_*` env vars; page refresh |
| Port 9002 busy | `npm run dev` — Turbopack will auto-pick next port |

---

## Key Numbers to Memorise
- Average SA government queue wait: **4.2 hours**
- QueUp target: **< 10 minutes** physical presence
- Demo branches: **5** (all Cape Town Metro)
- TFLite model size: **~45 KB**
- Claude max_tokens: **400** (fast responses)
- Integration tests: **4 / 4 PASS**
