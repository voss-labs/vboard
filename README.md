# vboard

Events and community platform for **VIT** (Vidyalankar Institute of Technology, Mumbai). Built under [voss-labs](https://github.com/voss-labs).

> The wedge: replace per-event Google Forms with unified, one-click registration. Clubs post events. Students register with one tap. Community managers see registrations from a dashboard.

## Status

Active development. Phase 0 (foundations) and the full UI pass on mock data are shipped. Auth, schema, and live data come in Phase 1+. See [`plan.md`](./plan.md) for the v1 roadmap and [`future.md`](./future.md) for deferred work.

## Stack

| Layer     | Choice                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19) on [Vite+](https://viteplus.dev/)                |
| Routing   | TanStack Router, file-based                                                                              |
| Database  | PostgreSQL on [Neon](https://neon.tech)                                                                  |
| ORM       | [Drizzle](https://orm.drizzle.team)                                                                      |
| Auth      | [Better Auth](https://better-auth.com) — email + password, verification via [Resend](https://resend.com) |
| UI        | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4                                                      |
| Type      | [Geist](https://vercel.com/font) + Geist Mono                                                            |
| Storage   | Cloudflare R2 (event covers, community logos)                                                            |
| Deploy    | Cloudflare Workers via Wrangler                                                                          |
| Tooling   | TypeScript strict, [Biome](https://biomejs.dev), pnpm                                                    |

## Quick start

Requires Node `>=22.12.0` and [Vite+](https://viteplus.dev/) (`vp` CLI).

```sh
git clone https://github.com/voss-labs/vboard.git
cd vboard
vp install
cp .env.local .env.local.real      # then fill in real values
vp dlx @better-auth/cli secret     # generates BETTER_AUTH_SECRET
vp dev                             # http://localhost:3000
```

### Environment variables

`.env.local` is a template. Fill in:

- `DATABASE_URL` — Neon Postgres connection string
- `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` — auth config
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — transactional email

R2 access in production goes through the binding configured in `wrangler.jsonc` — no env vars needed.

## Commands

| Command                           | What it does                                     |
| --------------------------------- | ------------------------------------------------ |
| `vp dev`                          | Dev server on `:3000` with HMR                   |
| `vp check`                        | Lint, format, and type check (run before commit) |
| `vp test`                         | Vitest                                           |
| `vp build`                        | Production build                                 |
| `vp dlx shadcn@latest add <name>` | Install a shadcn component on demand             |
| `pnpm db:generate`                | Generate migration from schema changes           |
| `pnpm db:push`                    | Apply schema directly to Neon (dev)              |
| `pnpm db:migrate`                 | Run pending migrations (production)              |
| `pnpm deploy`                     | Build and deploy to Cloudflare Workers           |

## Project structure

```text
vboard/
├── public/                       # static assets
├── src/
│   ├── components/
│   │   ├── ui/                   # shadcn primitives (zinc, new-york)
│   │   ├── Nav.tsx               # top nav with vermillion logo accent
│   │   ├── Footer.tsx
│   │   ├── PostCard.tsx          # feed card for events + announcements
│   │   ├── EventCalendar.tsx     # month grid with event dot markers
│   │   └── UnderConstruction.tsx # phase-gated stub for in-flight pages
│   ├── routes/                   # TanStack Router file-based routes
│   │   ├── __root.tsx            # global layout + meta
│   │   ├── index.tsx             # / — discover feed
│   │   ├── calendar.tsx          # /calendar — month view with side panel
│   │   ├── posts/$slug.tsx       # /posts/:slug — event / post detail
│   │   ├── communities/          # /communities, /communities/:slug
│   │   ├── login.tsx             # placeholder, ships in Phase 1
│   │   ├── signup.tsx            # placeholder, ships in Phase 1
│   │   ├── dashboard.tsx         # placeholder, ships in Phase 5
│   │   ├── profile.tsx           # placeholder, ships in Phase 1
│   │   └── api/auth/$.ts         # Better Auth handler
│   ├── db/
│   │   ├── index.ts              # Drizzle client
│   │   └── schema/               # one file per domain (added in Phase 1+)
│   ├── lib/
│   │   ├── auth.ts               # Better Auth config
│   │   ├── auth-client.ts        # client-side helpers
│   │   ├── email.ts              # Resend helpers (sendVerificationEmail)
│   │   ├── mock-data.ts          # UI fixtures, replaced by DB queries in Phase 1+
│   │   └── utils.ts              # cn() etc.
│   ├── integrations/             # third-party setup (better-auth, tanstack-query)
│   ├── styles.css                # design tokens + utilities
│   ├── router.tsx
│   └── routeTree.gen.ts          # auto-generated, do not edit
├── plan.md                       # v1 scope, schema, build phases
├── future.md                     # deferred features (phase 2+)
├── wrangler.jsonc                # Cloudflare Workers config + R2 binding
├── drizzle.config.ts             # schema path + migration output
└── biome.json                    # lint/format rules
```

## Routes

| Path                 | Page                           | Status                       |
| -------------------- | ------------------------------ | ---------------------------- |
| `/`                  | Discover feed                  | Mock data                    |
| `/calendar`          | Month calendar with side panel | Mock data                    |
| `/posts/:slug`       | Event / post detail            | Mock data                    |
| `/communities`       | Community directory            | Mock data                    |
| `/communities/:slug` | Community profile + posts      | Mock data                    |
| `/login`             | Sign in                        | Under construction (Phase 1) |
| `/signup`            | Join vboard                    | Under construction (Phase 1) |
| `/profile`           | User profile                   | Under construction (Phase 1) |
| `/dashboard`         | Community admin                | Under construction (Phase 5) |

## Identity & RBAC (planned)

- Signup gated by `@vit.edu.in` email + Resend-verified link
- Two site roles: `admin`, `student`
- Communities (clubs / societies) host posts and events
- Flat community membership — active row in `community_member` = full rights for that community
- Permission rule: `manage post X = (site admin) OR (active community_member for X.communityId)`

Full schema in [`plan.md`](./plan.md).

## Build phases

|     | Phase                     | Scope                                                                      |
| --- | ------------------------- | -------------------------------------------------------------------------- |
| 0   | Foundation                | Resend wiring, R2 binding, schema dir, Cloudflare deploy config — **done** |
| 1   | Auth & Profile            | Better Auth + Resend + domain whitelist, profile page                      |
| 2   | Communities               | Schema + admin CRUD, public community pages                                |
| 3   | Posts                     | Unified post/event schema, registration + approval flow                    |
| 4   | Discover Feed + Calendar  | Live data on home and `/calendar`                                          |
| 5   | Community Admin Dashboard | Registrations table, approve/reject, CSV export                            |
| 6   | Site Admin Tools          | Cross-community moderation, role assignment                                |

## Design

Editorial Swiss minimalism — the same design DNA as [vosslabs.org](https://github.com/voss-labs/vosslabs.org). Cream `#fafaf7` bg, near-black text, vermillion `#c4421d` accent, hairline borders, no decorative gradients. Geist for body, Geist Mono for labels and code.

## Contributing

This is open source under voss-labs. Issues and PRs welcome at [github.com/voss-labs/vboard](https://github.com/voss-labs/vboard).

Code conventions: see [`AGENTS.md`](./AGENTS.md) (also symlinked as `CLAUDE.md`).

## License

MIT
