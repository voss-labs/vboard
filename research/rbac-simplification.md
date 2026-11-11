# RBAC simplification investigation

Date: 2026-10-18. Status: discovery; no authorization/schema/data changes implemented. Boss requested simpler roles while the shared UI redesign was completing QA. Existing UI work is preserved.

## Current model

Site and community access are independent. Every account is a student by default. A person can be an organizer in one community and an ordinary participant in another.

| Role | Scope | Authority |
| --- | --- | --- |
| Student | Own account | Profile, register/cancel, own registrations |
| Volunteer | Community | Read team/drafts/attendees and manage attendance |
| Manager | Community | Volunteer authority plus author/publish posts, registration decisions and CSV export |
| Lead | Community | Manager authority plus team and settings |
| Admin | Site | Community lifecycle, lead appointments, people/audit, all community operations |
| Super admin | Site bootstrap | Admin authority plus appoint/remove admins; derived from SUPER_ADMIN_EMAILS |

Visitor is an unauthenticated state. The persisted site enum has only student/admin; super admin is not a database role. Membership means organizing staff, not a student following a club.

## Actual excess complexity

Six explicitly deferred features are partially active in runtime code: advisor, per-event co-host, permission overrides, department admin scope, pending invitations and community approval. Each adds a separate source of authority or lifecycle state without a complete administration workflow.

- Advisor has event approval capability and a live capacity>=80 publish gate, but no approval action/UI; edits can also cross that threshold without review.
- Co-host access falls back to a community-level object. Some reads ignore hostedPostIds and expose unrelated community content; some writes/edit/export paths reject co-host access instead.
- Overrides are global, not community-scoped, and not every policy consumer applies them. They have no management workflow.
- Department scope is checked by some community helpers while site listings/actions remain global.
- Invitation claiming exists, but creation/management does not. Community approval has schema/query state but no request/review workflow.
- COMMUNITY_ROLE_RANK is unused and duplicates overview ranking; post:moderate has no consumer and event:approve has no action consumer.

## Approaches and trade-offs

1. Recommended starting direction: retain meaningful lead/manager/volunteer boundaries and student/admin site roles, then retire unfinished runtime permission extensions from this release. This reduces policy paths while preserving current least privilege. Rename manager to Organizer in product copy only if useful. Faculty approval and other deferred product requirements remain documented rather than silently completed.
2. Merge lead and manager into one community Organizer. This removes a role, but deliberately gives event publishers control over team membership and settings. Volunteer remains restricted to attendance. Existing manager permissions expand, so this requires an explicit product decision and a reviewed migration.
3. Merge all community staff into Organizer. Simplest label set but grants attendance staff publishing, deletion, registration decisions, export, team and settings authority. This is not recommended unless Boss confirms that everyone on a team is equally trusted for those tasks.

Keep centralized capability checks whichever model is chosen. Retain bootstrap control over who appoints platform admins; it is inexpensive and protects platform ownership.

## First policy decision

Pending question sent to Boss: should every community organizer manage team/settings, or should that remain with a lead? No dependent implementation begins until answered. Retaining an attendance-only volunteer and any required faculty sign-off are subsequent product decisions.

## Change and migration surfaces

Policy/identity: src/lib/rbac.ts and tests, session.ts, home-role.ts and tests, auth.ts, proxy.ts, dev-personas.ts. Data access: queries/access.ts, communities.ts, members.ts, profiles.ts, posts.ts. Input boundary: db/validations.ts member schema. Consumers: dashboard shell/overviews, community layout/posts/authoring/detail/attendees/export/team/settings, site admin actions/pages, public post detail and community workspace entry, badges/labels and fixtures/docs.

community_role is referenced by community_member.role, community_invite.role and permission_override.role, including inactive records. Other extension surfaces are community_invite, event_host, permission_override, profile.admin_department, community.department/approval_status, post.advisor_approved_by/at and their enums/indexes/foreign keys.

No SQL migration exists yet beyond .gitkeep. Inventory the actual target database and extension rows before designing a rename or retirement migration; absence of UI is not evidence of empty data. Preserve historical audit details. Do not drop structures or silently map live roles during discovery.

## Evidence

Read-only Explore audit inspected src/lib/rbac.ts, src/lib/session.ts, schema/query modules, boundary validation, action/route consumers, fixture setup and research/rbac.md/future.md. Existing role distinctions are in rbac.ts; co-host fallback is in session.ts around line199; publication gate is in dashboard/c/[slug]/posts/actions.ts around line74. Known access concerns were already recorded in .preset/AUDIT.md and are not solved by the UI redesign.
