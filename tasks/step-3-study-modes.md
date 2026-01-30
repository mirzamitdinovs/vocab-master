# Step 3 — Flashcards + Quizzes + Stats

## Goal
Provide study modes (flashcards, multiple choice) and track stats.

## Tasks
1) Session builder UI:
   - Select chapter(s).
   - Choose quantity (10/20/50/all).
   - Toggle front language (Korean or translation).
2) GraphQL query: getSessionWords(userId, filters, limit).
3) Flashcards UI:
   - Tap-to-flip.
   - Next/previous.
   - Shuffle option.
4) Stats tracking:
   - Update stats on each answer or reveal (correct/incorrect).
   - GraphQL mutation: recordAnswer(wordId, correct).
5) Multiple-choice quiz:
   - Generate distractors from same user dataset.
   - 4 options with one correct.
   - Immediate feedback.

## Deliverables
- Flashcards flow working.
- Multiple-choice quiz working.
- Stats stored and visible (per-word + per-user totals).
