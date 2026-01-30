# Memrise-Style Learning System — Implementation Tasks

## Goal
Rebuild the learning flow to mirror Memrise’s two-phase system:
- **Learn**: bring new words into memory (3–6 tests per word, “flower” bloom)
- **Review**: spaced repetition schedule with reset-on-miss

This plan replaces the old tasks folder.

---

## Phase 0 — Data Model, Admin, Settings
- Add admin role (phone-based):
  - phone `+998901202467` => admin
- Create/extend tables:
  - `course` → `topic` → `word` (admin-managed content)
  - `word_progress`: per-user per-word state
    - fields: `userId`, `wordId`, `stage` (0–7), `nextReviewAt`, `learnedAt`, `lastAnswerAt`, `incorrectCount`, `correctCount`, `streak`, `isDifficult`, `totalTests`
  - `learning_settings` per user:
    - `learnSessionSize`, `reviewSessionSize`, `speedReviewSessionSize`
    - toggles: `enableTyping`, `enableTapping`, `enableListening`
  - `user_stat.points` for gamification
- Define the spaced repetition intervals in code:
  - `4h → 12h → 24h → 6d → 12d → 48d → 96d → 6mo`
- Define learn-phase target:
  - `requiredCorrects` default 6 (configurable), with early completion for easy items (3–4)

Deliverables:
- Prisma schema updates + migration
- Settings API + defaults
- Interval constants + scheduler utilities
- Admin access check + default admin phone

---

## Phase 1 — Learn Flow (New Words)
- No user topic selection; lessons are **admin-defined** and served in order
- Define selection query:
  - pull **unlearned** words by topic order
  - respect `learnSessionSize`
- For each word, run a **mixed test loop** until learned:
  - **Multiple choice**
  - **Typing**
  - **Tapping** (phrases/word order)
  - **Listening** (audio + answer)
- Track per-word test count in-session
  - word is “learned” once it hits target corrects with no mistakes
  - if wrong, repeat again in session
- Update `word_progress`:
  - mark learned
  - set `nextReviewAt` = now + 4h

Deliverables:
- Learn session UI flow
- Test-type selector / randomizer
- Progress UI (flower / bloom meter)

---

## Phase 2 — Review Flow (Spaced Repetition)
- Query words due for review:
  - `nextReviewAt <= now`
  - limit by `reviewSessionSize`
- Review test types:
  - tapping, typing, multiple choice, listening, comprehension
- On **correct**:
  - advance interval stage (stage + 1)
  - set `nextReviewAt` accordingly
- On **incorrect**:
  - reset to stage 0 (4 hours)
  - increment `incorrectCount`, mark `isDifficult`

Deliverables:
- Review UI flow
- Scheduler updates
- Progress messages: “ready for review” count

---

## Phase 3 — Difficult Words Mode
- Query:
  - words with `isDifficult = true` or high incorrect ratio
- Session uses mixed tests (mostly typing + multiple choice)
- Option to clear difficulty if correct streak reached

Deliverables:
- Difficult Words session UI
- Toggle: clear difficulties after N correct

---

## Phase 4 — Speed Review Mode
- Timer-based session
- Hearts: start at 3
- Lose heart on wrong answer or timeout
- Gain heart after 15 correct in a row
- End when hearts reach 0 or word list ends

Deliverables:
- Speed Review UI
- Countdown + heart meter
- Streak tracker

---

## Phase 5 — Practice Settings
- Settings page:
  - session sizes for Learn / Review / Speed Review
  - toggles: typing, tapping, listening
  - audio preferences

Deliverables:
- Settings UI connected to `learning_settings`

---

## Phase 6 — Analytics & Gamification
- XP/points per session and per correct answer
- Streak calendar
- Flower bloom animation per word
- Daily goal (X words learned / reviewed)

Deliverables:
- XP + streak tracking
- Daily goal UI

---

## Phase 7 — Admin Panel
- Admin panel (desktop sidebar + mobile navbar)
- CRUD:
  - Courses
  - Topics
  - Words (single add + CSV import)
- Move upload logic to admin only

Deliverables:
- Admin UI with protections
- CSV import for words

---

## Phase 8 — Migration from Current System
- Backfill `word_progress` for existing words
- Mark them as “learned” with `nextReviewAt` set to now
- Provide admin UI or one-time script

Deliverables:
- Migration script
- Safety check (no data loss)

---

## Open Decisions
- Typing input: use system keyboard or custom in-app?
- Listening: integrate TTS now or later?
- Tapping: full sentence mode needed now or later?
- How to determine “easy items” (3–4 tests)?
