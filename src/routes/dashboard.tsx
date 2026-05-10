import { createFileRoute } from "@tanstack/react-router";
import { UnderConstruction } from "#/components/UnderConstruction";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  return (
    <div className="space-y-10">
      <header className="space-y-3 hairline-bottom pb-7">
        <div className="eyebrow">Dashboard</div>
        <h1 className="display-xl" style={{ color: "var(--text)" }}>
          Community admin
        </h1>
        <p className="max-w-[52ch] text-[1rem] leading-[1.55]" style={{ color: "var(--text-dim)" }}>
          The control room for community managers. See registrations, approve requests, export
          attendees.
        </p>
      </header>

      <UnderConstruction
        phase="Phase 5"
        title="Registrations and moderation"
        description="This is where community admins will manage everything they host. The page is wired into the design system but the data layer ships with Phase 5 in plan.md."
        upcoming={[
          "Per-community view of all your posts and events",
          "Per-event registrations table with name, roll number, department, status",
          "Approve and reject pending registrations in bulk",
          "Export registrations as CSV",
          "Edit, cancel, or pin posts",
          "Manage community membership",
        ]}
      />
    </div>
  );
}
