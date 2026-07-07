/* 30-Day Hyrox Prep — program data
 * Each day carries an intermediate main set and a beginner-scaled version
 * (~70% volume/load). Scaling is authored, not parsed, so it always reads clean.
 */

const PHASES = [
  { id: 1, name: "Foundation",      short: "Phase 1", days: [1, 7],   blurb: "Build movement quality and base engine." },
  { id: 2, name: "Build",           short: "Phase 2", days: [8, 15],  blurb: "Add load and compromised running." },
  { id: 3, name: "Race Simulation", short: "Phase 3", days: [16, 23], blurb: "Full-station sims under fatigue." },
  { id: 4, name: "Taper & Peak",    short: "Phase 4", days: [24, 30], blurb: "Sharpen, recover, arrive fresh." },
];

const REST = { rest: true };

const DAYS = [
  // ---- Phase 1: Foundation ----
  {
    day: 1, phase: 1, session: "Full Body + Ski Erg",
    warmup: "5 min row easy + mobility",
    main: {
      intermediate: ["4×500m ski erg — easy, rest 2 min", "3×10 goblet squat"],
      beginner:     ["3×400m ski erg — easy, rest 2 min", "3×8 goblet squat"],
    },
    note: "Ski erg is about rhythm, not speed. Find a stroke you can repeat.",
  },
  {
    day: 2, phase: 1, session: "Run + Sled",
    warmup: "10 min easy jog",
    main: {
      intermediate: ["6×400m run — conversational pace", "4×20m sled push — light"],
      beginner:     ["4×400m run — conversational pace", "3×20m sled push — light"],
    },
    note: "First sled exposure. Technique only — low back flat, drive through the legs.",
  },
  {
    day: 3, phase: 1, session: "Rest / Mobility", ...REST,
    warmup: "—",
    main: {
      intermediate: ["20 min walk", "Hip + ankle mobility"],
      beginner:     ["15 min walk", "Hip + ankle mobility"],
    },
    note: "Active recovery. Keep it easy — this is part of the plan, not a day off it.",
  },
  {
    day: 4, phase: 1, session: "Strength + Wall Balls",
    warmup: "5 min bike",
    main: {
      intermediate: ["3×8 RDL", "3×8 lunges", "4×15 wall balls"],
      beginner:     ["3×6 RDL", "3×6 lunges", "3×12 wall balls"],
    },
    note: "Build a wall ball rhythm — squat and throw as one movement.",
  },
  {
    day: 5, phase: 1, session: "Run Intervals",
    warmup: "10 min jog",
    main: {
      intermediate: ["8×200m — moderate, 90s rest"],
      beginner:     ["6×200m — moderate, 90s rest"],
    },
    note: "Introduce pacing discipline. Every rep should feel the same.",
  },
  {
    day: 6, phase: 1, session: "Row + Burpee Broad Jump",
    warmup: "5 min row",
    main: {
      intermediate: ["3×300m row", "3×8 burpee broad jumps"],
      beginner:     ["3×250m row", "3×6 burpee broad jumps"],
    },
    note: "Technique focus, low volume. Smooth on the row, controlled on the jumps.",
  },
  {
    day: 7, phase: 1, session: "Rest", ...REST,
    warmup: "—",
    main: { intermediate: ["Full rest"], beginner: ["Full rest"] },
    note: "Full rest. Let the week's work settle.",
  },

  // ---- Phase 2: Build ----
  {
    day: 8, phase: 2, session: "Compromised Run #1",
    warmup: "—",
    main: {
      intermediate: ["3× (400m run + 10 wall balls) — rest 2 min"],
      beginner:     ["3× (300m run + 7 wall balls) — rest 2 min"],
    },
    note: "First compromised running. Legs will feel heavy off the wall balls — that's the point.",
  },
  {
    day: 9, phase: 2, session: "Sled Focus",
    warmup: "—",
    main: {
      intermediate: ["6×20m sled push + 6×20m sled pull — moderate"],
      beginner:     ["4×20m sled push + 4×20m sled pull — moderate"],
    },
    note: "Increase load 10–15% from Phase 1. Short, powerful steps.",
  },
  {
    day: 10, phase: 2, session: "Rest", ...REST,
    warmup: "—",
    main: { intermediate: ["Active recovery walk"], beginner: ["Active recovery walk"] },
    note: "Active recovery. Loosen up, stay mobile.",
  },
  {
    day: 11, phase: 2, session: "Engine Day",
    warmup: "—",
    main: {
      intermediate: ["20 min continuous: 200m run + 15 KB swings, repeat"],
      beginner:     ["14 min continuous: 200m run + 10 KB swings, repeat"],
    },
    note: "Build aerobic capacity under fatigue. Steady, unbroken effort.",
  },
  {
    day: 12, phase: 2, session: "Strength",
    warmup: "5 min bike",
    main: {
      intermediate: ["4×6 deadlift", "4×8 lunges", "3×12 farmers carry 40m"],
      beginner:     ["3×6 deadlift", "3×8 lunges", "3×12 farmers carry 30m"],
    },
    note: "Preps you for sandbag lunges. Brace hard, own every rep.",
  },
  {
    day: 13, phase: 2, session: "Run Intervals",
    warmup: "—",
    main: {
      intermediate: ["6×400m — moderate-hard, 2 min rest"],
      beginner:     ["4×400m — moderate-hard, 2 min rest"],
    },
    note: "Controlled hard pace. Fast but repeatable — no heroes on rep one.",
  },
  {
    day: 14, phase: 2, session: "Compromised Run #2",
    warmup: "—",
    main: {
      intermediate: ["4× (300m run + 12 wall balls)"],
      beginner:     ["3× (300m run + 8 wall balls)"],
    },
    note: "Volume increase from Day 8. Hold your run pace even when tired.",
  },
  {
    day: 15, phase: 2, session: "Rest", ...REST,
    warmup: "—",
    main: { intermediate: ["Full rest"], beginner: ["Full rest"] },
    note: "Full rest before the simulation block. Eat and sleep well.",
  },

  // ---- Phase 3: Race Simulation ----
  {
    day: 16, phase: 3, session: "Mini Hyrox #1",
    warmup: "—",
    main: {
      intermediate: ["1km run", "1 min ski erg", "800m run", "1 min row", "600m run"],
      beginner:     ["700m run", "45s ski erg", "600m run", "45s row", "400m run"],
    },
    note: "First multi-station sim. Moderate pace — learn the transitions.",
  },
  {
    day: 17, phase: 3, session: "Sled + Lunges",
    warmup: "—",
    main: {
      intermediate: ["8×20m sled push — heavy", "3×20 sandbag lunges"],
      beginner:     ["6×20m sled push — moderate", "3×14 sandbag lunges"],
    },
    note: "The #1 beginner limiter. Extra volume here pays off on race day.",
  },
  {
    day: 18, phase: 3, session: "Rest", ...REST,
    warmup: "—",
    main: { intermediate: ["Active recovery"], beginner: ["Active recovery"] },
    note: "Active recovery. Keep blood moving, don't add fatigue.",
  },
  {
    day: 19, phase: 3, session: "Run Intervals",
    warmup: "—",
    main: {
      intermediate: ["5×600m — race pace target, 2 min rest"],
      beginner:     ["4×500m — race pace target, 2 min rest"],
    },
    note: "Dial in your goal pace. This is the number you'll chase on race day.",
  },
  {
    day: 20, phase: 3, session: "Compromised Run #3",
    warmup: "—",
    main: {
      intermediate: ["5× (400m run + 12 burpee broad jumps)"],
      beginner:     ["4× (300m run + 8 burpee broad jumps)"],
    },
    note: "Highest intensity combo of the block. Empty the tank.",
  },
  {
    day: 21, phase: 3, session: "Strength",
    warmup: "—",
    main: {
      intermediate: ["3×6 deadlift — heavy", "3×10 KB swings", "Grip work"],
      beginner:     ["3×6 deadlift — moderate", "3×8 KB swings", "Grip work"],
    },
    note: "Maintain strength — don't chase PRs this close to race day.",
  },
  {
    day: 22, phase: 3, session: "Mini Hyrox #2",
    warmup: "—",
    main: {
      intermediate: ["800m run + wall balls", "800m run + sled push", "800m run"],
      beginner:     ["600m run + wall balls", "600m run + sled push", "600m run"],
    },
    note: "Full-body fatigue sim. Practise staying smooth when everything hurts.",
  },
  {
    day: 23, phase: 3, session: "Rest", ...REST,
    warmup: "—",
    main: { intermediate: ["Full rest"], beginner: ["Full rest"] },
    note: "Full rest. The hard work is done — now you protect it.",
  },

  // ---- Phase 4: Taper & Peak ----
  {
    day: 24, phase: 4, session: "Light Technique",
    warmup: "—",
    main: {
      intermediate: ["Easy run", "Light reps on your 2 weakest stations"],
      beginner:     ["Easy run", "Light reps on your 2 weakest stations"],
    },
    note: "Confidence work, not fatigue. Move well, then stop.",
  },
  {
    day: 25, phase: 4, session: "Short Sharp Intervals",
    warmup: "—",
    main: {
      intermediate: ["4×300m — race pace"],
      beginner:     ["3×300m — race pace"],
    },
    note: "Short, fast, low volume. Wake the legs up without draining them.",
  },
  {
    day: 26, phase: 4, session: "Rest", ...REST,
    warmup: "—",
    main: { intermediate: ["Full rest"], beginner: ["Full rest"] },
    note: "Full rest. Trust the taper — feeling fresh is the goal.",
  },
  {
    day: 27, phase: 4, session: "Half Race Simulation",
    warmup: "—",
    main: {
      intermediate: ["Stations 1–4 at race effort"],
      beginner:     ["Stations 1–4 at moderate-race effort"],
    },
    note: "Final intensity check. Rehearse your race-day routine exactly.",
  },
  {
    day: 28, phase: 4, session: "Easy Movement",
    warmup: "—",
    main: {
      intermediate: ["20 min easy jog", "Mobility"],
      beginner:     ["15 min easy jog", "Mobility"],
    },
    note: "Flush the legs. Nothing hard — just movement.",
  },
  {
    day: 29, phase: 4, session: "Rest", ...REST,
    warmup: "—",
    main: { intermediate: ["Full rest", "Hydrate", "Carb up"], beginner: ["Full rest", "Hydrate", "Carb up"] },
    note: "Full rest, hydrate, carb up. Lay your kit out tonight.",
  },
  {
    day: 30, phase: 4, session: "RACE DAY", raceDay: true,
    warmup: "—",
    main: {
      intermediate: ["Full Hyrox — or your final simulation"],
      beginner:     ["Full Hyrox — or your final simulation"],
    },
    note: "Trust the work. You've done everything you needed to. Go get it.",
  },
];
