# 30-Day Hyrox Prep

A premium, mobile-first training app. Single static site — no backend, no build
step. State persists in `localStorage`.

## Files
- `index.html` — markup + passcode gate + modals
- `styles.css` — dark theme, turquoise accent, athletic type
- `data.js` — the 30-day program (intermediate + beginner-scaled sets)
- `app.js` — all logic (gate, countdown, progress, day sheet, persistence)

## Selling it — Gumroad license keys
Access is gated by a **unique license key per buyer**, verified live against
Gumroad. No backend: the app calls Gumroad's public verify endpoint straight
from the browser (`api.gumroad.com/v2/licenses/verify`, which allows CORS).

**Setup (one-time):**
1. In Gumroad, edit your product → check **"Generate a unique license key per
   sale"**. Gumroad then shows a verification code snippet containing your
   **product ID**.
2. Open `app.js` and set `const GUMROAD_PRODUCT_ID = "...";` to that product ID
   (the long token, *not* the short `/l/xxxx` permalink).
3. Deploy. Deliver just the link — each buyer's key arrives automatically on
   their Gumroad receipt and confirmation email.

**How the gate behaves:**
- Buyer enters their key once → verified → unlocked, key saved to the device.
- Later opens work **offline** (gym-friendly) from the saved state.
- When online, it silently re-checks: a **refund, chargeback, or dispute closes
   access** on the next load. Network errors never lock a paying user out.
- A "Dev preview" link appears on `localhost` only (never on your live domain)
   so you can click through the app without a key while testing.

**Smoothing the buyer's first open (optional but recommended):**
1. In Gumroad, edit your product → Content → **"Redirect to a URL after
   purchase"** → paste your app's URL. Buyers now land in the app automatically.
2. The gate gives them the fastest way in:
   - **"Paste my key"** — one tap, reads the key they copied from the receipt.
   - Pasting the key into the field **auto-verifies** (no button press needed).
   - Note: Gumroad's redirect passes `sale_id`/`product_id`, **not** the license
     key, so the buyer still supplies the key once (copy + one tap). Turning a
     sale ID into an unlock would require a backend.
3. **Advanced / automation:** the app also reads a key from the URL —
   `yourapp.com/?key=THE-KEY` (or `#key=THE-KEY`) — auto-verifies it, then strips
   it from the address bar. Use this if you wire up a tool (Zapier, a custom
   email link, etc.) that can inject each buyer's key. Inert with plain Gumroad.

> Note: like any client-side gate, a determined technical user could extract the
> content from the page source. License keys tie access to a real payment and
> stop casual sharing — the right trade-off for a no-backend product.

## Deploy to Netlify
Drag-and-drop this `hyrox-prep` folder onto <https://app.netlify.com/drop>, or
connect the repo and set the publish directory to `hyrox-prep`. No build command.

## Features
- 4 phases, 30 days, overall + per-phase progress bars
- Tap any day → warm-up, main set, coaching note
- Mark complete (persists, updates progress)
- Race-date countdown → auto-selects the day you should be on
- Beginner / Intermediate toggle (~70% volume/load scaling)
