# vboard — Plan

vboard is the events + community platform for VIT (Vidyalankar Institute of Technology, Mumbai), under voss-labs. Sister project to verp.

The wedge: replace the per-event Google Form workflow with unified, one-click registration. Custom form fields are phase 2.

## Tech Stack

- TanStack Start (React 19) on Vite+ — file-based routing, server functions
- TypeScript strict, Biome (lint + format)
- Drizzle ORM + PostgreSQL on Neon
- Better Auth (email + password) with email verification via Resend
- Tailwind 4 + shadcn (zinc, new-york style)
- Cloudflare R2 for image storage
- Cloudflare Workers deployment via Wrangler
- pnpm

## v1 MVP Scope

What's in:

- Signup gated by `@vit.edu.in` + Resend-verified email
- Profile: rollNumber (trust-on-signup), department
- Communities (clubs / societies as hosts)
- Flat community membership — anyone in = full rights for that community
- Unified `post` model — text announcement OR event, depending on whether event fields are filled
- One-click direct registration with optional approval flow
- Community admin dashboard: see / approve registrations per event
- Site-level admin role for platform-wide moderation

Anything not listed here lives in `future.md`.

## Design / UX

Aesthetic: clean, minimal, shadcn-native. Zinc base palette, new-york style, Inter or Geist body type. Generous whitespace, restrained color, no decorative gradients. Reads like a serious editorial product, not a club website.

Reference points: Luma for event-card shape and detail page; Linear for typography rhythm and dashboard density; verp's site for tonal consistency across the voss-labs ecosystem.

### Key surfaces

- **Discover feed** — chronological list of posts (events + announcements) with cover image, host community badge, date chip, RSVP CTA on event cards
- **Calendar view** — month grid where dates with events show a dot/count; clicking a date reveals that day's events in a side panel or below. shadcn's `Calendar` primitive as the base, custom rendering for event indicators.
- **Event detail** — Luma-shaped: cover image, host community, title, date/time, location (gated when `after_approval`), one-click registration CTA, about section
- **Community page** — logo, cover, about, posts feed scoped to that community, member list (where appropriate)
- **Community admin dashboard** — registrations table per event, approve/reject pending rows, CSV export
- **Profile** — avatar, name, rollNumber, dept, posts authored, events registered

### shadcn components likely used

button, card, calendar, dialog, dropdown-menu, form, input, textarea, select, sheet, table, tabs, badge, avatar, alert, toast, separator, skeleton

Install via CLI as needed: `pnpm dlx shadcn@latest add <component>`

## Identity & RBAC

### Auth flow

1. Signup with email + password (Better Auth)
2. Domain check: must be `@vit.edu.in`
3. Resend sends verification link, user clicks
4. On verify: create profile row, assign `student` site role
5. Subsequent logins → session cookie via TanStack Start adapter

### Site roles (2)

- `admin` — voss-labs / college team running the platform
- `student` — every verified VIT user (default)

### Community membership (flat)

Active row in `community_member` = full rights for that community: create/edit posts, manage registrations, add/remove other members. No internal lead/member split.

### Permission rules

```
manage post X      = (site admin) OR (active community_member for X.communityId)
add member to Y    = (site admin) OR (active community_member for Y)
manage everything  = site admin
```

Shared-credentials trade-off: a club may share one community_member account in practice. Schema doesn't force it; clubs can also add per-person rows.

## Database Schema

Better Auth managed: `user`, `session`, `account`, `verification`.

vboard-owned tables:

### profile (1:1 with user)

- userId (FK, unique)
- rollNumber (text, nullable, indexed) — students fill, faculty/admin leave blank
- department (text, nullable) — "CSE", "EC", etc.
- bio (text, nullable)
- isActive, timestamps

### role (2 seeded rows)

- name (unique) — `admin`, `student`
- displayName, description, hierarchyLevel (admin=100, student=10)
- permissions (jsonb, default `{}`)
- isActive, timestamps

### user_role (junction)

- userId, roleId (unique together)
- assignedBy (FK, nullable), expiresAt (nullable)
- isActive, timestamps

### community

- slug (unique), name, description
- logoUrl, coverImageUrl
- createdBy (FK)
- isActive, timestamps

### community_member (flat)

- communityId, userId (unique together)
- joinedAt, isActive

### post (unified — text or event)

- communityId (FK, NOT NULL)
- authorId (FK, NOT NULL)
- title (text, nullable)
- body (text)
- imageUrl (text, nullable) — optional
- visibility (enum: `public` | `vit_only`)
- isPinned (bool, default false)
- status (enum: `draft` | `published` | `cancelled` | `completed` | `hidden`)
- isEvent (bool, default false) — explicit flag; when true, event fields below are populated
- startsAt, endsAt (timestamptz, nullable)
- location (text, nullable)
- locationVisibility (enum: `public` | `after_approval`, nullable)
- registrationOpensAt, registrationClosesAt (timestamptz, nullable)
- capacity (int, nullable)
- requiresApproval (bool, default false)
- timestamps

Validation enforced at server boundary (Zod): if `isEvent = true`, `startsAt` and `endsAt` are required.

### registration

- postId, userId (unique together) — only valid when post.isEvent = true
- status (enum: `pending` | `approved` | `rejected` | `cancelled` | `attended` | `no_show`)
- registeredAt, timestamps

## Build Phases

### Phase 0 — Foundation

- Delete `todos` demo schema (`src/db/schema.ts`)
- Wire Resend (env var, sender domain, transactional helper)
- Add R2 binding to `wrangler.jsonc`
- Verify Neon connection live
- Replace boilerplate `CLAUDE.md` / `AGENTS.md` with project-specific instructions

### Phase 1 — Auth & Profile

- Schema: `profile`, `role`, `user_role` (split into files under `src/db/schema/`)
- Better Auth: email/password + email verification + `@vit.edu.in` domain whitelist
- Signup → email verification → profile creation page
- Login, logout, profile edit page

### Phase 2 — Communities

- Schema: `community`, `community_member`
- Site admin: create community (form with R2 logo + cover upload)
- Community admin: add/remove members
- Public community page (logo, about, posts feed for that community)
- Communities directory page

### Phase 3 — Posts (text + events)

- Schema: `post`, `registration`
- Community admin: create post (title, body, optional image)
- Toggle "make this an event" → exposes event fields (date, location, capacity, approval, registration window)
- Post detail page handles both text post and event views
- One-click registration for events; approval flow when `requiresApproval = true`
- Address gating when `locationVisibility = after_approval`

### Phase 4 — Discover Feed + Calendar

- Home: unified feed of all posts sorted by recency
- Filter by community
- Visibility gating (public visible to all, vit_only requires login)
- Calendar view route: month grid (shadcn `Calendar` primitive) with date markers for days that have events; clicking a date reveals that day's events in a side panel
- Toggle between feed view and calendar view

### Phase 5 — Community Admin Dashboard

- Per-community view: all that community's posts/events
- Per-event registrations table (name, rollNumber, dept, registeredAt, status)
- Approve / reject pending registrations
- Export registrations to CSV

### Phase 6 — Site Admin Tools

- Manage all communities
- Ban users / hide posts
- Role assignments

## Conventions

- Schema files: `src/db/schema/<domain>.ts`, reexported via `src/db/schema/index.ts`
- Queries: `src/db/queries/<domain>.ts` — async functions returning plain objects, not ORM instances
- Server logic: `createServerFn` from `@tanstack/react-start`
- Validation: Zod at every server boundary
- Imports: `#/` alias, never relative
- Format: Biome (tabs, double quotes); run `pnpm check` before commit
- Migrations: `pnpm db:generate` after schema changes, `pnpm db:push` to apply
- File size: 200–400 lines max per file; split when it grows
- shadcn components installed on demand: `pnpm dlx shadcn@latest add <component>` — don't preinstall components we won't use
