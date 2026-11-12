# Deploying vboard to Vercel

At this handoff (2026-10-18), the restricted Neon roles and all ten migrations (`0000`–`0009`) are applied. Migration checksums and runtime role/RLS/grant verification pass. The local production app returns HTTP 200 for Discover, Communities, Calendar, Login and the anonymous auth-session endpoint against that database using only `DATABASE_URL`. The deployed Vercel release still needs this source update and matching restricted runtime URL. The `vboard-assets` bucket is planned, not deployed; real VOSS sign-in and logo upload/read remain unverified.

## Vercel environment variables

Set these in Vercel's Production environment before deploying. Use matching branch-scoped values for any Preview environment you intentionally configure. Never copy the current mixed local environment unchanged.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection for restricted `vboard_app`, with TLS. Do not use `neondb_owner`. |
| `BETTER_AUTH_SECRET` | Independent cryptographically random secret, at least 32 bytes. |
| `BETTER_AUTH_URL` | Exact public HTTPS application origin, such as `https://vboard.vosslabs.org`. |
| `VOSS_DISCOVERY_URL` | `https://accounts.vosslabs.org/api/auth/.well-known/openid-configuration` |
| `VOSS_CLIENT_ID` | vboard's own registered VAuth client ID. |
| `VOSS_CLIENT_SECRET` | Matching private client secret. |
| `AWS_ENDPOINT_URL_S3` | The production branch's Neon Object Storage HTTPS endpoint. |
| `AWS_REGION` | The storage endpoint's region; override any unrelated Vercel default. |
| `AWS_ACCESS_KEY_ID` | Production branch storage credential ID. |
| `AWS_SECRET_ACCESS_KEY` | Matching storage secret with write access, kept server-side. |
| `NEON_STORAGE_BUCKET` | `vboard`, the private bucket declared in `neon.ts`. Images are served through `/media/<key>`, never from the bucket directly. |
| `RESEND_API_KEY` | Resend key used by the Super admin Updates page. Without it the page previews but does not send. |
| `EMAIL_FROM` | Sender for updates, on a domain verified in Resend. Defaults to `vboard <updates@vosslabs.org>`; use an address that receives replies. |

`DATABASE_URL` is the only runtime database URL. Both domain transactions and Better Auth's local tables use this restricted principal. No auth-specific URL/password or owner fallback is used. The shared trusted server credential can CRUD Better Auth's four tables; application/import boundaries isolate the adapter, while domain data still uses FORCE RLS and checked projections.

Leave `VBOARD_DEV_AUTH` entirely absent from Vercel. The build rejects it. Administrative `DIRECT_URL`, the provisioning password and `SUPER_ADMIN_EMAILS` belong in deployment infrastructure, not application runtime. Setting `SUPER_ADMIN_EMAILS` only in Vercel does not grant authority: provisioning synchronizes the private SQL allowlist.

The current app requires the canonical hosted VAuth discovery URL and issuer even when vboard itself runs locally. A localhost VAuth discovery URL disables this provider. Register the exact callback `${BETTER_AUTH_URL}/api/auth/oauth2/callback/voss` with the hosted provider; substitute the actual origin rather than using that expression literally. A new Vercel preview origin needs its own allowed callback and matching client configuration. See [VOSS authentication](./voss-auth.md).

## GitHub deployment environment

Create the `production-database` GitHub environment and set the exact secrets consumed by `.github/workflows/deploy.yml`:

| Secret | Purpose |
| --- | --- |
| `PRODUCTION_DIRECT_URL` | Direct, unpooled administrative Neon connection for provisioning and migrations. |
| `PRODUCTION_DATABASE_URL` | Same restricted `vboard_app` URL configured in Vercel. |
| `PRODUCTION_APP_PASSWORD` | Password used when provisioning `vboard_app`; must match its runtime URL. |
| `PRODUCTION_SUPER_ADMIN_EMAILS` | Comma-separated verified `@vit.edu.in` addresses to synchronize into the private SQL allowlist. |
| `VERCEL_DEPLOY_HOOK_URL` | Private Vercel production deployment hook for this project. |

The workflow provisions roles/allowlist, applies ordered migrations, checks migration history and verifies restricted database principals before requesting a Vercel release. It does not provision Object Storage. Review `neon config plan` for the supplied production target, then run `neon deploy` to create the declared bucket. Preserve existing environment files: CLI env pull supplies owner-level database URLs, which must not replace the restricted runtime URLs above.

Create restricted database roles through `npm run db:provision`, using SQL and the administrative connection. Neon Console/API-created roles inherit `neon_superuser` and are unsuitable for the existing runtime verifier. Provisioning supports a non-superuser administrative owner with `CREATEROLE` and the necessary role administration rights. It rejects existing superuser, replication or RLS-bypassing roles and verifies restrictions after membership cleanup. It does not grant elevated roles to runtime credentials.

The administrative migration owner receives membership in `vboard_guard` with SET/INHERIT so it can maintain helper functions. The helper receives schema CREATE only within a pending migration's transaction; it is revoked before the migration ledger and commit. Failure rolls back the temporary grant. Applied SQL files remain unchanged, and the helper retains neither schema CREATE nor runtime role memberships after migration.

Apply `0009_single_runtime_principal.sql` before releasing the single-URL application. It grants the runtime role CRUD on Better Auth tables, revokes the obsolete auth role's access and retires that login without dropping records. Provisioning keeps the historical role present but NOLOGIN for earlier migration compatibility. Remove obsolete auth database URL/password variables from local, Vercel and GitHub configuration after updating the release.

The managed-admin regression is `PROVISION_TEST_URL=<local-disposable-admin-url> npx tsx scripts/test-provision.ts`. It requires an explicitly local test database and rejects a cluster with existing vboard roles. Use a separate disposable PostgreSQL instance; cluster roles are shared across databases. The regression exercises provisioning, restriction repair, elevated-role rejection, all migrations and repeat execution, helper ownership and the unchanged runtime verifier.

`vercel.json` disables automatic deployments from `main`. If the PR merges before these GitHub secrets are configured, the deployment workflow skips its mutating steps; that is not a successful release. After configuring both environments and provisioning storage, run **Deploy production** manually in GitHub Actions. Observe the actual Vercel build/deployment result; acceptance of the deployment hook alone does not establish health.

Do not run a seed, reset or schema push against this remote target. Use the existing numbered SQL migrations. Before updating an existing dataset, inventory it and retain a private recovery point. Provisioning privileges and runtime role/RLS/grant checks passed against the actual Neon target; repeat verification after future database changes.

## Service checks after release

1. Open `/` and `/communities`; confirm database-backed pages load. Verify a real hosted VOSS sign-in and sign-out with a verified VIT account.
2. Verify Super admin/Lead/Organizer/Student boundaries using actual current SQL assignments. Creating a community or editing its settings must persist after reload and produce the existing audit entry.
3. As Lead or Super admin, upload a PNG/JPEG/WebP logo of at most 2 MiB in community settings. Save, reload and confirm the logo loads on the public community list/detail. An Organizer or Student must be unable to change settings.
4. Confirm rejected image types/oversize files fail, and verify that no credentials appear in browser assets, image URLs or shared logs.

Public logos use immutable keys and cache headers. The database stores a branch-independent `neon://` reference; rendering uses the current branch's storage endpoint. Existing external HTTP(S) image URLs remain supported. Old logo objects are retained when replaced/removed. A failed SQL save attempts to remove only its new upload; process interruption or cleanup failure can leave an unreferenced object. Storage cleanup failures produce a sanitized structured server error.

No remote restore, application rollback or live provider exchange has been verified for this release. Migration files commit individually with their checksum ledger entry; correct a failed migration's cause and rerun without editing already applied files. There are no down migrations. A recovery must keep database state and the application version compatible; never use seed or reset as recovery.
