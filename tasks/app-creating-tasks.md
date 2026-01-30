# Vocab Flashcards App — Tasks (MVP → Iterative)

## 0) Goals & Non-Goals
- Goal: Mobile-first web app to upload CSV (4 columns), save to DB, and study via flashcards and quizzes.
- Goal: Support reverse reveal (English → Korean, or Korean → English) on tap.
- Goal: Handwriting practice input (finger on phone) to help learn letter shapes.
- Non-goal (initial): account system, social sharing, spaced repetition algorithm (can add later).

## 1) Product Requirements (MVP)
- Next.js fullstack app (no separate backend).
- UI: Tailwind + shadcn/ui components.
- Upload CSV with 4 columns: `order`, `korean`, `translation`, `chapter`.
- CSV validation:
  - Only accept `.csv` file uploads.
  - Check header/column count and show clear error + instructions if incorrect.
- Parse CSV and store entries in a database.
- User account (no password):
  - On first open, ask for name + phone number.
  - If phone exists, load that user’s data.
  - If not, create user record and proceed.
- Vocabulary storage:
  - Single vocabulary table, rows owned by user.
  - On CSV upload, insert only rows that don’t already exist for that user.
- Stats (MVP):
  - Track per-user totals (words learned, sessions completed).
  - Track per-word correct/incorrect counts.
- Flashcards:
  - Show front text based on toggle (English/Korean).
  - Tap to flip and show the other language.
  - Next/previous navigation.
- Study session:
  - Select chapter(s) and quantity of words for the session.

## 2) Tech Decisions (Proposed)
- Next.js (App Router) for fullstack.
- UI: Tailwind CSS + shadcn/ui.
- DB: Neon PostgreSQL.
- Data layer: Prisma + Prisma Client queries.
- API: GraphQL (Next.js API route or serverless handler).
- Storage: Upload and parse CSV server-side, persist to DB via Prisma.
- Flashcards and quizzes served via GraphQL.
- Handwriting practice: HTML Canvas + pointer events (no recognition yet).

## 3) Tasks — Phase 1 (Foundations)
1) Project setup
   - Initialize Next.js app (App Router).
   - Add Tailwind + shadcn/ui setup.
   - Add env config for Neon PostgreSQL.

2) Data model
   - Tables: `user`, `vocabulary`.
   - `user`: id, name, phone, created_at.
   - `vocabulary`: id, user_id, order, korean, translation, chapter, created_at.
   - `stats`: id, user_id, word_id, correct_count, incorrect_count, last_seen_at.
   - Unique constraint for de-dupe: (user_id, korean, translation, chapter).
   - Phone is unique.

3) CSV import
   - API endpoint: `POST /api/import`.
   - Server parses CSV (validate columns, trim whitespace).
   - Reject non-CSV file uploads.
   - For each row, insert only if not already present for that user.
   - Return import summary: rows inserted, rows skipped, validation errors.

4) User onboarding
   - Landing screen asks for phone + name.
   - If phone exists, load user and continue.
   - If not, create user then continue.

5) Flashcards MVP
   - UI: simple card, tap-to-flip.
   - Toggle: front language (English/Korean).
   - Session: basic queue, next/previous.

## 4) Tasks — Phase 2 (Study Modes)
1) Session builder
   - Filter by chapter(s).
   - Choose quantity (e.g., 10, 20, 50, all).

2) Multiple-choice quiz
   - API: generate quiz with distractors.
   - UI: question + 4 options, immediate feedback.

3) Progress tracking (light)
   - Track session completion count.
   - Optional: per-word correct/incorrect.

## 5) Tasks — Phase 3 (Handwriting Practice)
1) Handwriting UI (practice-only)
   - Canvas with finger input.
   - Clear button + stroke replay.
   - Show target word and per-letter guidance.

## 6) Tasks — Phase 4 (Quality & UX)
- Mobile-first layout polishing.
- Add import error messages (missing columns, duplicates).
- Basic offline support (service worker / cached last session).
- Settings: default front language, shuffle, and session size.

## 7) Nice-to-have Ideas (Later)
- Spaced repetition scheduling.
- Audio (TTS for Korean/English).
- Favorites and difficult words list.
- Chapter progress summary.

## 8) Step Files (Build Order)
- Step 1: `tasks/step-1-foundations.md`
- Step 2: `tasks/step-2-auth-upload.md`
- Step 3: `tasks/step-3-study-modes.md`
- Step 4: `tasks/step-4-handwriting-practice.md`

## 9) Open Questions
- Should the app remember the last phone number on device (localStorage) or ask every time?
- Do you want GraphQL to be code-first (schema in code) or SDL-first (schema file)?
- Should translations be stored as plain text only, or allow multiple translations per word later?
