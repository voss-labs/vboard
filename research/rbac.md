# Four-role authorization

The accepted role model is Super admin, Lead, Organizer and Student. Visitor is an unauthenticated state. The implementation contract is `.preset/RBAC_API_CONTRACT.md`; `.Codex/rules/database-security.md` records database and authentication boundaries.

| Capability                                           | Super admin | Lead                 | Organizer            | Student |
| ---------------------------------------------------- | ----------- | -------------------- | -------------------- | ------- |
| Platform/community lifecycle, people, audit          | yes         | no                   | no                   | no      |
| Assign, change or remove Leads                       | yes         | no                   | no                   | no      |
| Manage community settings and appoint Organizers     | yes         | own active community | no                   | no      |
| Posts/events, decisions, attendance, export          | yes         | own active community | own active community | no      |
| Own profile, event registration/cancellation/history | yes         | yes                  | yes                  | yes     |

Committee authority requires an active membership in an active community. Each community assignment is independent. Lead inherits Organizer capabilities but cannot promote anyone to Lead or change an existing Lead. Super admin comes from the private SQL allowlist synchronized from `SUPER_ADMIN_EMAILS`, never a writable profile field.

Every server mutation validates explicit writable fields with schema-derived Zod and checks central capabilities. Its transaction binds only a verified user ID; SQL rereads current authority, verifies exact event/community ownership, enforces transitions/capacity and writes audit atomically. A stale page cannot preserve a revoked grant.

Public discovery/detail/calendar use checked projections. Gated location stays redacted until approval/attendance or current operator access. Attendee and team identities are scoped operational projections. Own registration history preserves minimal event summaries after withdrawal or soft deletion without exposing unpublished bodies or other participants.

Registration answers follow the registration row. The student reads their own; current Organizers and Leads of the hosting community and Super admin read every answer for that event; nobody else reads any. Answers are validated in SQL against the event's questions, cannot change after submission except by cancelling and registering again, and never enter the audit log. Once an event has a registration, its questions and choices can be reworded or added to but not removed.

Event registration counts approved/attended seats. Registration, approval and capacity changes use the same event transaction lock. Bulk decisions reject the whole batch if any submitted row is missing, belongs to another event, or cannot make that transition. Students may retry only cancelled registrations; rejected requests cannot be retried.

Former site authority, additional committee roles and permission extensions are retired from runtime and privately archived by migrations. Historical audit details remain unchanged. Deferred ideas belong in `research/future.md` and confer no current authority.

Community requests follow the requester. A signed-in student sends one request at a time and reads or withdraws only their own; Super admin reads every pending request with the requester's name and email and approves or rejects it. Approval creates the community and appoints the requester as Lead in the same transaction. The request's details cannot change after submission, and a closed request cannot be reopened.

Update emails are Super admin only. The sender picks an audience (everyone who has signed in, people with a complete profile, or people without one); the server resolves the addresses, each person gets a separate copy, and the send is written to the audit log with its subject, audience and counts.
