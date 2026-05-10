# vboard — Project Instructions

vboard is the events + community platform for VIT (Vidyalankar Institute of Technology, Mumbai), under voss-labs. Sister project to verp (`/Users/harshalmore31/code/voss/verp/`).

The product wedge: replace per-event Google Forms with unified one-click registration.

For the full plan, read `plan.md`. For deferred features, read `future.md`. Don't pollute `plan.md` with future ideas.

CLAUDE.md is symlinked to this file — same content applies to all coding agents.

## Stack

- TanStack Start (React 19) on Vite+ — file-based routing, server functions via `createServerFn`
- TypeScript strict, Biome for lint + format
- Drizzle ORM + PostgreSQL on Neon
- Better Auth (email + password) with email verification via Resend
- Tailwind 4 + shadcn (zinc, new-york style)
- Cloudflare R2 for image storage, Cloudflare Workers for deploy
- pnpm

## Commands

- `pnpm dev` — run dev server on port 3000
- `pnpm check` — Biome lint + format check (run before commit)
- `pnpm test` — Vitest
- `pnpm db:generate` — generate migration from schema changes
- `pnpm db:push` — apply schema to database directly (dev-only)
- `pnpm db:migrate` — run pending migrations (production)
- `pnpm dlx shadcn@latest add <component>` — install shadcn component on demand
- `pnpm deploy` — build + deploy to Cloudflare Workers

## Conventions

- Schema: `src/db/schema/<domain>.ts`, reexported via `src/db/schema/index.ts` barrel
- Queries: `src/db/queries/<domain>.ts` — async functions returning plain objects
- Server logic: `createServerFn` from `@tanstack/react-start`
- Validation: Zod at every server boundary
- Imports: `#/` alias (mapped to `src/`), never relative
- Formatting: Biome (tabs, double quotes)
- File size: 200–400 lines max per file; split when bigger
- shadcn components installed on demand, not preinstalled

## Identity & RBAC

- Signup gated by `@vit.edu.in` email + Resend-verified link
- 2 site roles: `admin`, `student`
- Communities (clubs/societies) host posts and events
- Flat community membership: active row in `community_member` = full rights for that community
- Permission rule: `manage post X = (site admin) OR (active community_member for X.communityId)`

## Schema notes

- `post` is unified: text announcements OR events (when `isEvent = true`, event fields populated)
- `registration` only valid for posts where `isEvent = true`
- All ID fields are UUID; rollNumber is text (trust-on-signup, no list validation in v1)
- Better Auth manages `user` / `session` / `account` / `verification` tables; we own everything else

## When adding code

- Follow verp's query/schema patterns where they apply (`/Users/harshalmore31/code/voss/verp/src/db/`)
- The React framework differs (TanStack Start vs Next.js) — page/route conventions don't transfer; data layer does
- Don't preinstall shadcn components or add features beyond what plan.md specifies
- If a feature isn't in plan.md, it goes in `future.md`, not into the codebase
- No emojis anywhere — code, comments, commits, docs
- One-line comments only when the WHY is non-obvious; never narrate the WHAT
