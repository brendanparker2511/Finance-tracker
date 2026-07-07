# 30-Day Hyrox Prep

A premium, mobile-first training app. Single static site — no backend, no build
step. State persists in `localStorage`.

## Files
- `index.html` — markup + passcode gate + modals
- `styles.css` — dark theme, turquoise accent, athletic type
- `data.js` — the 30-day program (intermediate + beginner-scaled sets)
- `app.js` — all logic (gate, countdown, progress, day sheet, persistence)

## Selling it
1. **Passcode:** open `app.js` and change `const PASSCODE = "HYROX30";` to the code
   you give buyers. It's a soft gate (client-side) — enough for a Gumroad/Stan
   product, not hard auth.
2. **Sell access** on Gumroad/Stan; deliver the deployed link + the passcode in
   the purchase email.

## Deploy to Netlify
Drag-and-drop this `hyrox-prep` folder onto <https://app.netlify.com/drop>, or
connect the repo and set the publish directory to `hyrox-prep`. No build command.

## Features
- 4 phases, 30 days, overall + per-phase progress bars
- Tap any day → warm-up, main set, coaching note
- Mark complete (persists, updates progress)
- Race-date countdown → auto-selects the day you should be on
- Beginner / Intermediate toggle (~70% volume/load scaling)
