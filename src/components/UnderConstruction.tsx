import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  upcoming?: string[];
  phase?: string;
};

export function UnderConstruction({
  title = "Under development",
  description,
  upcoming,
  phase,
}: Props) {
  return (
    <section className="surface space-y-6 p-8" style={{ background: "var(--bg-elevated)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="eyebrow">Under development</div>
          <h2 className="display-md" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          {description && (
            <p
              className="max-w-[52ch] text-[0.95rem] leading-relaxed"
              style={{ color: "var(--text-dim)" }}
            >
              {description}
            </p>
          )}
        </div>
        {phase && (
          <span
            className="font-mono text-[0.7rem] uppercase tracking-[0.12em] whitespace-nowrap"
            style={{ color: "var(--text-muted)" }}
          >
            {phase}
          </span>
        )}
      </div>

      {upcoming && upcoming.length > 0 && (
        <div className="space-y-3 hairline-top pt-5">
          <div className="mono-label">What's coming</div>
          <ul className="space-y-2">
            {upcoming.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[0.95rem]"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="mt-2 size-1.5 rounded-full shrink-0"
                  style={{ background: "var(--brand)" }}
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[0.78rem] uppercase tracking-[0.06em] hover:text-[var(--brand)] transition-colors"
        style={{ color: "var(--text)" }}
      >
        Back to discover <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}

export function DevelopmentNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-[0.85rem]"
      style={{
        borderColor: "var(--brand)",
        background: "color-mix(in oklab, var(--brand) 8%, transparent)",
        color: "var(--text)",
      }}
    >
      <span
        className="mt-1.5 size-1.5 rounded-full shrink-0"
        style={{ background: "var(--brand)" }}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}
