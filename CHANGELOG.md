# Changelog

## Unreleased

- Event management page: rare and destructive post actions move into a More menu with confirmation; the registrations table gets one Filter answers menu with removable chips, a Columns menu for answer columns, a header select-all, division and year under the roll number, and a selection bar that appears only when rows are ticked.
- Post pages lead with the post: the community header and tabs stay on the community's own pages, and the manage page shows one back link, the title, a one-line summary and its actions.
- Registration review sheet: profile facts in a labelled row, numbered answers with unanswered questions collapsed to one line, links in text answers, and previous / next beside Approve and Reject in the footer, with the left and right arrow keys moving between registrations.
- Registration decisions: the selection bar offers only the actions the selected rows can take and applies each to the eligible rows, so a mixed selection no longer fails; decisions show at once and one audit insert replaces one per row.
- Profile: roll number and year sit side by side, the roll number confirms its department and division on one line under the field, the bio counts characters, the panel says whether the profile is ready to register, and account and team details share one card.
- Community requests: a student sends a request from Start a community in the workspace, with a name, address, public description, a note for the reviewer and a contact number and email only the reviewer sees; Super admin approves or rejects it on the Communities page, and approval creates the community with the requester as its Lead. New `community_request` table (migration 0012).
- Communities admin page: requests to review sit above a full-width table, and the create form opens from a New community button.
- Public Communities page: compact cards with the logo beside the name, a two-line description and one line of counts, plus a Start a community entry in the header and at the end of the grid.
- Community Team and Settings pages: adding a member is one row above the table, Remove is quiet until confirmed, the logo field shows the logo beside its upload, and Settings fills the page with a card showing how the community appears publicly.
- Contact number: the profile holds a 10-digit mobile number, asked in onboarding and required to register. The team running an event sees it in the review sheet and the CSV export, and the Start a community form fills it in. New `profile.phone` column (migration 0013).
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
