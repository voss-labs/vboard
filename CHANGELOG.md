# Changelog

## Unreleased

- Event management page: rare and destructive post actions move into a More menu with confirmation; the registrations table gets one Filter answers menu with removable chips, a Columns menu for answer columns, a header select-all, division and year under the roll number, and a selection bar that appears only when rows are ticked.
- Onboarding: the first time someone registers for an event they add their roll number (department and division are read from it), pick their year from a dropdown and can add a bio. Registration needs a complete profile; the hosting team sees division, year and bio in the review sheet, and division and year in the CSV export.
- Event registration questions: Organizers add required or optional single-choice and long-text questions to an event; students answer when registering, and the hosting team reads the answers in the registrations view and the CSV export.
- Sign in with VOSS (OIDC, PKCE) like VERP; passwords removed. Local persona switcher behind `VBOARD_DEV_AUTH`.
- Five-layer RBAC: visitor, student, community lead / manager / volunteer, site admin, super admin. Capabilities in `src/lib/rbac.ts`, documented in `research/rbac.md`.
- Schema: `profile`, `community`, `community_member`, `post`, `registration`, `audit_log`.
- Public pages read from Postgres; one-tap registration, approval queues, location gating, VIT-only posts.
- Dashboard built from the shadcn `dashboard-01` block and base-nova components: overview, registrations, profile, community posts and events, registrations with bulk actions and CSV export, team, settings, admin communities, people, audit log.
- `npm run dev:setup` takes a fresh clone to a seeded local database, like VERP; `npm run dev:seed` loads demo data: 100 people, full teams, 19 posts, about 370 registrations and audit history.

- Rebuilt on the verp project structure: Next.js 16 App Router, npm, ESLint, Prettier, Vitest, Vercel.
- Ported every existing page (Discover, Calendar, Communities, Community, Post, Sign in, Join, Dashboard, Profile) with the original design unchanged.
- Extracted the design system into `docs/UI_UX_SPEC.md`, with a frozen snapshot of the original UI in `docs/design/`.
- Better Auth now persists to Postgres through the Drizzle adapter, with Resend email verification.
- Event dates are formatted and grouped in `Asia/Kolkata`.
