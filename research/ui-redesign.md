# Shared shadcn UI redesign

Research date: 2026-10-18. Boss approved a shared design system with public pages and a separate sidebar workspace. The requested scope is the whole existing product.

## Findings

Both vboard and VERP already use shadcn `base-nova`, Base UI, Tailwind 4, Lucide, Geist and Geist Mono. A library migration is unnecessary. The work is to standardize composition, visual tokens, navigation and workflow states.

VERP's implemented sources are the reference. Its proposed UI specification differs from its shipped theme and typography. The real table reference is `src/components/data-table-view.tsx`; `data-table.tsx` is an unused starter with demo content. See `.preset/VERP_UI_REFERENCE.md` for the complete source inventory.

vboard's dashboard already has the sidebar, cards, fields, tables, tabs and confirmations. Its public pages use separately styled surfaces, custom buttons, large headings and uppercase mono labels. Public navigation also hides its destinations on mobile. Shared building blocks must cover both surfaces.

Shadcn distributes owned component source with composable interfaces. Its blocks supply layout starting points; keeping that source coherent and validating real workflows is still our responsibility. Semantic CSS variables allow the same components to work across light and dark themes. The Field pattern supports durable validation messages beside controls.

## Accepted structure

Public pages keep top navigation: Discover, Calendar and Communities, with sign-in/account access and a complete mobile Sheet menu. Public event links remain directly shareable.

Personal, community-team and admin tools keep the sidebar workspace. Desktop collapse and mobile Sheet behavior use the existing shadcn primitives. The community/event context remains visible in headers. All roles use the same navigation and component vocabulary, scoped to existing permissions.

The alternative was a sidebar around every screen, including discovery. Boss selected two layouts because public browsing and operational work have distinct navigation needs while benefiting from the same design system.

## Visual direction

- Neutral canvas and white/near-black work surfaces, with vboard orange reserved for identity, selection and focus.
- Initial light palette: canvas `#fafafa`, paper `#ffffff`, ink `#171717`, supporting text `#525252`, border `#e5e5e5`, brand `#c4421d`. Components consume semantic tokens; dark mode overrides those tokens.
- Retain Geist. Use 14–16px reading text, 12px supporting labels, 24px workspace headings and restrained 30–36px public headings. Mono is for identifiers and numeric data.
- Shared 16px mobile / 24px desktop gutters, compact section rhythm, one radius scale, flat bordered cards and restrained interaction motion.
- Use sentence case, explicit action verbs and text-labelled states. Layout emphasizes event identity, date and the next permitted action.

## Screen treatment

| Surface | Redesign outcome |
| --- | --- |
| Discover | Compact introduction followed by the real mixed feed; recognizable event metadata and shared Card composition. |
| Calendar | Calendar and selected-day list in matching surfaces; stacked mobile layout; server-safe display data. |
| Communities | Readable directory and community identity, with a consistent post feed and existing management entry. |
| Post/event detail | Clear title, host, date, capacity and visibility; readable body; prominent registration status and next action. |
| Sign-in | Focused VOSS-only composition, safe return path, errors and guarded dev personas. |
| Workspace overview | Compact role-relevant counts and existing actionable work; avoid unbounded attention lists dominating the screen. |
| Registrations/events | Aligned toolbars, status vocabulary, visible results and useful mobile record layouts. |
| Authoring | Content, event details and registration settings grouped with Field primitives; consistent action placement and pending feedback. |
| Community team/settings/profile | Consistent form sections, permissions-aware actions and readable mobile layouts. |
| Admin communities/people/audit | Shared identity, table, toolbar, badge and empty-state patterns. |
| Failure/empty/loading | Same shell and typography, clear recovery/next step, accessible pending and error messages. |

## Boundaries and verification

Use the existing Server Components, queries, Server Actions, Zod validation and RBAC. Preserve registration decisions, capacity/windows, check-in, cancellation, CSV, role changes and archive behavior. No new schema, role system, notifications, images/uploads, charts, global search or deferred product features.

The calendar's raw location currently crosses into client props. Redacting presentation data on the server is appropriate when rebuilding that surface. Other pre-existing audit concerns remain tracked and must not be misrepresented as solved by a visual redesign.

Verify representative student, organizer, volunteer and admin journeys at desktop and mobile widths, both themes, keyboard focus/navigation, menu/dialog behavior, long labels, empty results and pending/error states. Run the repository check. Browser inspection of forms is separate from destructive mutations or production sign-in/deployment.

## Sources

- VERP local source: `src/app/globals.css`, `src/components/app-sidebar.tsx`, `page-header.tsx`, `stat-card.tsx`, `dash-panel.tsx`, `data-table-view.tsx`, `record-dialog.tsx`, `confirm-action.tsx`, `empty-state.tsx`.
- [VERP repository](https://github.com/voss-labs/verp)
- [shadcn introduction](https://ui.shadcn.com/docs)
- [shadcn blocks](https://ui.shadcn.com/blocks)
- [Semantic theme tokens](https://ui.shadcn.com/docs/theming)
- [Base UI Sidebar](https://ui.shadcn.com/docs/components/base/sidebar)
- [Base UI Field validation](https://ui.shadcn.com/docs/components/base/field)
