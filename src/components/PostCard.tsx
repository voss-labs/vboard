import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock } from "lucide-react";
import { cn } from "#/lib/utils";
import { getCommunityById, type Post } from "#/lib/mock-data";

type Props = {
  post: Post;
  variant?: "default" | "compact";
};

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

function formatEventDate(start: Date, end?: Date) {
  const day = dayFmt.format(start);
  const time = timeFmt.format(start);
  if (!end) return `${day} · ${time}`;
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay ? `${day} · ${time}–${timeFmt.format(end)}` : `${day} → ${dayFmt.format(end)}`;
}

function bodyPreview(text: string, max = 180) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export function PostCard({ post, variant = "default" }: Props) {
  const community = getCommunityById(post.communityId);
  const compact = variant === "compact";

  return (
    <article
      className={cn("surface surface-hover group relative flex flex-col", compact ? "p-5" : "p-6")}
    >
      {/* meta row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {community && (
            <Link
              to="/communities/$slug"
              params={{ slug: community.slug }}
              className="inline-flex items-center gap-2 text-[0.78rem] font-medium hover:text-[var(--brand)] transition-colors"
              style={{ color: "var(--text)" }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: "var(--brand)" }}
                aria-hidden
              />
              {community.name}
            </Link>
          )}
        </div>
        {post.isEvent ? (
          <span
            className="font-mono text-[0.7rem] uppercase tracking-[0.12em]"
            style={{ color: "var(--text-dim)" }}
          >
            Event
          </span>
        ) : (
          <span
            className="font-mono text-[0.7rem] uppercase tracking-[0.12em]"
            style={{ color: "var(--text-muted)" }}
          >
            Note
          </span>
        )}
      </div>

      {/* title */}
      <Link to="/posts/$slug" params={{ slug: post.slug }} className="mt-5 block">
        <h3
          className={cn(
            "display-tight font-semibold transition-colors group-hover:text-[var(--brand)]",
            compact ? "text-[1.05rem]" : "text-[1.4rem] md:text-[1.6rem]",
          )}
          style={{ color: "var(--text)" }}
        >
          {post.title}
        </h3>
      </Link>

      {/* body */}
      <p
        className={cn("mt-3 leading-relaxed", compact ? "text-[0.85rem]" : "text-[0.95rem]")}
        style={{ color: "var(--text-dim)" }}
      >
        {bodyPreview(post.body, compact ? 110 : 180)}
      </p>

      {/* event meta strip */}
      {post.isEvent && (
        <div
          className="mt-5 grid gap-y-2 gap-x-6 text-[0.78rem] font-mono"
          style={{
            gridTemplateColumns: "max-content max-content max-content max-content",
          }}
        >
          {post.startsAt && (
            <MetaCell label="When" value={formatEventDate(post.startsAt, post.endsAt)} />
          )}
          {post.location && (
            <MetaCell
              label="Where"
              value={
                post.locationVisibility === "after_approval" ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3" aria-hidden /> after approval
                  </span>
                ) : (
                  post.location
                )
              }
            />
          )}
          {typeof post.capacity === "number" && (
            <MetaCell label="Spots" value={`${post.registrationCount}/${post.capacity}`} />
          )}
          {post.requiresApproval && <MetaCell label="Status" value="approval required" />}
        </div>
      )}

      {/* footer row */}
      <div
        className="mt-6 flex items-center justify-between text-[0.78rem]"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="font-mono">{post.authorName}</span>
        <Link
          to="/posts/$slug"
          params={{ slug: post.slug }}
          className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.08em] hover:text-[var(--brand)] transition-colors"
          style={{ color: "var(--text)" }}
        >
          {post.isEvent ? (post.requiresApproval ? "Request" : "Register") : "Read"}
          <ArrowUpRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      </div>

      {post.isPinned && (
        <span
          className="absolute right-6 top-6 size-1.5 rounded-full"
          style={{ background: "var(--brand)" }}
          aria-label="Pinned"
        />
      )}
    </article>
  );
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap">
      <span
        className="text-[0.65rem] uppercase tracking-[0.14em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}
