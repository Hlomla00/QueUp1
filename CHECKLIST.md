# QueUp — Pre-Finals Day Verification Checklist
**Complete all items before the MICT SETA National Finals presentation**

---

## SYSTEM CHECKS

### Next.js Web App
- [ ] `npm run dev` starts without errors on port 9002
- [ ] `npm run build` completes successfully (0 errors)
- [ ] Home page (`/`) loads with hero image and department scroller
- [ ] `/join/flow` — full ticket flow works end-to-end
- [ ] `/queue/[ticketId]` — live tracking page loads
- [ ] `/auth/signin` and `/auth/signup` pages load
- [ ] `/branch/[branchId]` — branch detail + 3D map renders

### Firebase / Firestore
- [ ] `.env.local` has all 6 `NEXT_PUBLIC_FIREBASE_*` variables set
- [ ] `.env.local` has `ANTHROPIC_API_KEY` set
- [ ] Firestore collections exist: `branches`, `queueTickets`, `analytics`, `predictions`, `notifications`
- [ ] At least 5 seed branches present in Firestore (`GET /api/branches?seed=true`)
- [ ] At least 1 branch has `congestionLevel: "FULL"` (for demo Phase 2)
- [ ] Firebase Auth is enabled in Firebase Console
- [ ] Firestore rules allow read/write for demo (or service account key present)

### API Routes
- [ ] `POST /api/ticket` — returns 201 for normal branch
- [ ] `POST /api/ticket` — returns 409 for FULL branch
- [ ] `PATCH /api/ticket/[id]` — status update works
- [ ] `GET /api/branches` — returns branches array
- [ ] `GET /api/analytics/[branchId]` — returns live + historical data
- [ ] `POST /api/recommend` — Claude responds with JSON recommendation
- [ ] `POST /api/redirect` — Claude returns redirect with reasoning

### Three.js 3D Map
- [ ] ThreeJsMap component renders without console errors
- [ ] All 5 Cape Town branches appear as pillars at correct positions
- [ ] Pillar heights update in real time (onSnapshot)
- [ ] FULL branch (CBD) shows red colour + pulsing halo ring
- [ ] Clicking a pillar shows the popup overlay
- [ ] Auto-rotation is smooth, no jank
- [ ] OrbitControls work (drag, pinch, scroll)

---

## HARDWARE CHECKS

### Android Tablet (Kiosk)
- [ ] App installs via `adb install app-release.apk`
- [ ] Kiosk mode: no status bar, no navigation bar
- [ ] Screen stays on (FLAG_KEEP_SCREEN_ON)
- [ ] Service selection grid shows all 6 categories
- [ ] Phone number entry field works with on-screen keyboard
- [ ] TFLite model loads: `wait_predictor.tflite` in assets
- [ ] TFLite prediction appears on success screen
- [ ] Firebase ticket is created in Firestore after submission
- [ ] Offline mode: disable WiFi, issue ticket → syncs on reconnect

### Thermal Printer
- [ ] USB-OTG cable connected: tablet → printer
- [ ] USB permission granted on Android
- [ ] `ThermalPrinter.connect()` returns `true`
- [ ] Test print: ticket number prints in large text
- [ ] Branch name, service, name, phone all printed correctly
- [ ] Partial cut fires after each ticket
- [ ] Paper is loaded and printer is powered

---

## ML MODEL CHECKS

### Python Training Script
- [ ] `pip install -r ml/requirements.txt` completes
- [ ] `python ml/train_wait_predictor.py` finishes in < 60 seconds
- [ ] Output shows MAE, RMSE, R² values
- [ ] `ml/wait_predictor.tflite` file is generated
- [ ] TFLite model size is printed (expected ~40-80 KB)
- [ ] Scatter plot saved to `ml/wait_predictor_scatter.png`
- [ ] Model copied to `android/app/src/main/assets/wait_predictor.tflite`

---

## INTEGRATION TESTS

Run: `npx tsx tests/test_integration.ts`

- [ ] Test 1 PASS — Ticket creation returns 201
- [ ] Test 2 PASS — TFLite value > 0 in ticket
- [ ] Test 3 PASS — Full branch 409 + Claude redirect works
- [ ] Test 4 PASS — 3D map data integrity (coordinates + queue values)
- [ ] All 4/4 tests pass in < 30 seconds total

---

## DEMO ENVIRONMENT

### Browser Setup
- [ ] Chrome / Edge latest version
- [ ] Browser zoom set to 100%
- [ ] Full-screen mode ready (F11)
- [ ] No pending browser notifications
- [ ] Dark mode ON (matches QueUp theme)
- [ ] Two tabs pre-opened: Home (`/`) and 3D Map page
- [ ] DevTools closed

### Network
- [ ] Stable WiFi connection confirmed
- [ ] Mobile hotspot ready as backup
- [ ] Firestore latency < 200ms (check Network tab in DevTools)

### Presentation
- [ ] HDMI/display adaptor tested with projector
- [ ] 1920×1080 resolution confirmed
- [ ] Demo script memorised (5.5 min maximum)
- [ ] Fallback instructions reviewed
- [ ] Printed ticket from thermal printer on hand (backup prop)

---

## FINAL SIGN-OFF

| Area | Status | Checked By | Time |
|---|---|---|---|
| Web App | ☐ Ready | | |
| Firebase | ☐ Ready | | |
| API Routes | ☐ Ready | | |
| 3D Map | ☐ Ready | | |
| Android Kiosk | ☐ Ready | | |
| Thermal Printer | ☐ Ready | | |
| ML Model | ☐ Ready | | |
| Integration Tests | ☐ 4/4 PASS | | |
| Demo Environment | ☐ Ready | | |

**All items checked = DEMO READY ✅**

---

*QueUp — Your queue, without the wait.*
