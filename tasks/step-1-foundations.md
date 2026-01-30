# Step 1 — Foundations

## Goal
Boot a Next.js app with Tailwind + shadcn/ui, Prisma, and a GraphQL API endpoint wired to Neon PostgreSQL.

## Tasks
1) Initialize Next.js app (App Router) with TypeScript.
2) Set up Tailwind CSS and shadcn/ui.
3) Add Prisma + Neon connection string (.env).
4) Define initial Prisma schema (user, vocabulary, stats) with phone unique.
5) Run initial migration and generate Prisma Client.
6) Add GraphQL server endpoint (code-first or SDL-first).
7) Add a basic health query to confirm GraphQL is reachable.

## Deliverables
- Running dev server.
- `prisma/schema.prisma` with core models.
- GraphQL endpoint responding to a health query.
