import { createFileRoute } from "@tanstack/react-router";
import { EventCalendar } from "#/components/EventCalendar";

export const Route = createFileRoute("/calendar")({ component: CalendarPage });

function CalendarPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-5 hairline-bottom pb-8">
        <div className="eyebrow">Calendar</div>
        <h1 className="display-xl" style={{ color: "var(--text)" }}>
          What's on, day by day.
        </h1>
        <p
          className="max-w-[42ch] text-[1.05rem] leading-[1.55]"
          style={{ color: "var(--text-dim)" }}
        >
          Click a marked day to see events scheduled for that date.
        </p>
      </header>

      <EventCalendar />
    </div>
  );
}
