import { useMemo, useState } from "react";
import { Calendar } from "#/components/ui/calendar";
import { PostCard } from "#/components/PostCard";
import { getEvents, type Post } from "#/lib/mock-data";

export function EventCalendar() {
  const events = useMemo(() => getEvents(), []);
  const [selected, setSelected] = useState<Date | undefined>(() => new Date());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const ev of events) {
      if (!ev.startsAt) continue;
      const key = ev.startsAt.toDateString();
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const eventDays = useMemo(
    () => events.map((e) => e.startsAt).filter((d): d is Date => !!d),
    [events],
  );

  const selectedEvents = selected ? (eventsByDay.get(selected.toDateString()) ?? []) : [];

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
      <div className="surface p-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={{ hasEvent: eventDays }}
          modifiersClassNames={{
            hasEvent:
              "font-semibold relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:size-1 after:rounded-full after:bg-[var(--brand)]",
          }}
        />
        <div
          className="mt-2 flex items-center justify-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.1em]"
          style={{ color: "var(--text-dim)" }}
        >
          <span className="size-1 rounded-full" style={{ background: "var(--brand)" }} />
          day with events
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <div className="eyebrow">{selected ? formatHeader(selected) : "Pick a day"}</div>
          <h2 className="display-md mt-3" style={{ color: "var(--text)" }}>
            {selectedEvents.length === 0
              ? "Nothing scheduled"
              : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
          </h2>
          {selected && eventsAreInPast(selected) && (
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              This day is in the past.
            </p>
          )}
        </div>

        {selectedEvents.length > 0 && (
          <div className="grid gap-4">
            {selectedEvents.map((post) => (
              <PostCard key={post.id} post={post} variant="compact" />
            ))}
          </div>
        )}

        {selectedEvents.length === 0 && selected && (
          <div
            className="surface p-8 text-center text-sm font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            No events on this day. Try a marked date.
          </div>
        )}
      </div>
    </div>
  );
}

const headerFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
function formatHeader(d: Date) {
  return headerFmt.format(d);
}

function eventsAreInPast(d: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day.getTime() < now.getTime();
}
