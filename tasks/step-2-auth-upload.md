# Step 2 — User Onboarding + CSV Upload

## Goal
Allow user to enter name + phone, create or fetch user, and upload a CSV with validation.

## Tasks
1) Build onboarding screen (mobile-first) asking for name + phone.
2) GraphQL mutation: createUserIfMissing(phone, name).
3) Store user id in localStorage (or session) after onboarding.
4) Build upload screen for CSV only (.csv restriction).
5) CSV validation:
   - Require exactly 4 headers: order, korean, translation, chapter.
   - Show clear error + instruction if mismatch.
6) GraphQL mutation: importVocabulary(userId, csvData).
7) Import logic:
   - Trim values.
   - Skip empty rows.
   - De-duplicate by (user_id, korean, translation, chapter).
   - Return inserted vs skipped counts.

## Deliverables
- Working onboarding flow.
- CSV upload with validation and error messaging.
- Import results summary (inserted, skipped, errors).
