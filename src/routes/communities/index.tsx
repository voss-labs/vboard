import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { communities } from "#/lib/mock-data";

export const Route = createFileRoute("/communities/")({
  component: CommunitiesIndex,
});

function CommunitiesIndex() {
  return (
    <div className="space-y-12">
      <header className="space-y-5 hairline-bottom pb-8">
        <div className="eyebrow">Communities</div>
        <h1 className="display-xl" style={{ color: "var(--text)" }}>
          Clubs and societies on vboard.
        </h1>
        <p
          className="max-w-[42ch] text-[1.05rem] leading-[1.55]"
          style={{ color: "var(--text-dim)" }}
        >
          Each community runs its own events and posts. Join one to find your people.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => (
          <Link
            key={c.id}
            to="/communities/$slug"
            params={{ slug: c.slug }}
            className="surface surface-hover group block p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className="grid size-11 place-items-center rounded-[var(--radius)] font-mono text-base font-semibold"
                style={{
                  background: "var(--text)",
                  color: "var(--bg)",
                }}
              >
                {c.name.charAt(0)}
              </div>
              <span
                className="font-mono text-[0.7rem] uppercase tracking-[0.12em]"
                style={{ color: "var(--text-muted)" }}
              >
                {c.memberCount} members
              </span>
            </div>

            <h3
              className="display-tight mt-6 text-[1.2rem] font-semibold transition-colors group-hover:text-[var(--brand)]"
              style={{ color: "var(--text)" }}
            >
              {c.name}
            </h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {c.description}
            </p>

            <div
              className="mt-5 inline-flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.08em]"
              style={{ color: "var(--text)" }}
            >
              View community
              <ArrowUpRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
