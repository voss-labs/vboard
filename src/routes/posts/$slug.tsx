import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Lock } from "lucide-react";
import { getCommunityById, getPostBySlug, type Post } from "#/lib/mock-data";

export const Route = createFileRoute("/posts/$slug")({
  component: PostDetail,
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
});

const fullDateFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

function formatRange(start: Date, end?: Date) {
  const startDate = fullDateFmt.format(start);
  const startTime = timeFmt.format(start);
  if (!end) return { date: startDate, time: startTime };
  const sameDay = start.toDateString() === end.toDateString();
  return {
    date: sameDay ? startDate : `${startDate} – ${fullDateFmt.format(end)}`,
    time: sameDay ? `${startTime}–${timeFmt.format(end)}` : `${startTime} → ${timeFmt.format(end)}`,
  };
}

function PostDetail() {
  const { post } = Route.useLoaderData();
  const community = getCommunityById(post.communityId);

  return (
    <article className="mx-auto max-w-3xl space-y-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 font-mono text-[0.78rem] uppercase tracking-[0.06em] hover:text-[var(--brand)] transition-colors"
        style={{ color: "var(--text-dim)" }}
      >
        <ArrowLeft className="size-3.5" /> Back to discover
      </Link>

      <header className="space-y-6 hairline-bottom pb-10">
        <div className="flex flex-wrap items-center gap-4">
          {community && (
            <Link
              to="/communities/$slug"
              params={{ slug: community.slug }}
              className="inline-flex items-center gap-2 hover:text-[var(--brand)] transition-colors"
              style={{ color: "var(--text)" }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: "var(--brand)" }}
                aria-hidden
              />
              <span className="font-medium">{community.name}</span>
            </Link>
          )}
          <span className="mono-label">{post.isEvent ? "Event" : "Note"}</span>
          {post.visibility === "vit_only" && (
            <span
              className="inline-flex items-center gap-1 mono-label"
              style={{ color: "var(--text-muted)" }}
            >
              <Lock className="size-3" aria-hidden /> VIT only
            </span>
          )}
        </div>

        <h1 className="display-xl text-balance" style={{ color: "var(--text)" }}>
          {post.title}
        </h1>

        <p className="font-mono text-sm" style={{ color: "var(--text-dim)" }}>
          Posted by {post.authorName}
        </p>
      </header>

      {post.isEvent && post.startsAt && <EventMeta post={post} />}

      <section className="space-y-5">
        <div className="eyebrow">About</div>
        <p
          className="whitespace-pre-line text-[1.05rem] leading-[1.65]"
          style={{ color: "var(--text)" }}
        >
          {post.body}
        </p>
      </section>

      {post.isEvent && <RegistrationCta post={post} />}
    </article>
  );
}

function EventMeta({ post }: { post: Post }) {
  if (!post.startsAt) return null;
  const { date, time } = formatRange(post.startsAt, post.endsAt);

  return (
    <dl className="surface grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0 [&>*]:p-6 [&_*]:divide-[var(--border)]">
      <MetaBlock label="When">
        <div style={{ color: "var(--text)" }}>{date}</div>
        <div className="font-mono text-sm" style={{ color: "var(--text-dim)" }}>
          {time}
        </div>
      </MetaBlock>
      <MetaBlock label="Where">
        <div style={{ color: "var(--text)" }}>
          {post.locationVisibility === "after_approval" ? (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-4" aria-hidden /> Address after approval
            </span>
          ) : (
            (post.location ?? "TBD")
          )}
        </div>
      </MetaBlock>
      <MetaBlock label="Capacity">
        {typeof post.capacity === "number" ? (
          <>
            <div style={{ color: "var(--text)" }}>
              {post.registrationCount} / {post.capacity}
            </div>
            <div className="font-mono text-sm" style={{ color: "var(--text-dim)" }}>
              {post.capacity - post.registrationCount} spots left
            </div>
          </>
        ) : (
          <div style={{ color: "var(--text)" }}>Unlimited</div>
        )}
      </MetaBlock>
    </dl>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <dt className="mono-label">{label}</dt>
      <dd className="text-base">{children}</dd>
    </div>
  );
}

function RegistrationCta({ post }: { post: Post }) {
  const closesIn = post.registrationClosesAt
    ? new Date(post.registrationClosesAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <aside
      className="surface sticky bottom-4 z-10 flex flex-col items-stretch justify-between gap-5 p-6 md:flex-row md:items-center"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div className="space-y-1">
        <div className="mono-label">Registration</div>
        <div className="text-base" style={{ color: "var(--text)" }}>
          {post.requiresApproval
            ? "Approval required — request to join"
            : "Open — register with one tap"}
        </div>
        {closesIn && (
          <div className="font-mono text-sm" style={{ color: "var(--text-dim)" }}>
            Closes {closesIn}
          </div>
        )}
      </div>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[var(--radius-sm)] font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em] transition-colors hover:bg-[var(--accent-fg-soft)]"
        style={{ background: "var(--text)", color: "var(--bg)" }}
      >
        {post.requiresApproval ? "Request to join" : "Register"}
        <ArrowUpRight className="size-4" aria-hidden />
      </button>
    </aside>
  );
}
