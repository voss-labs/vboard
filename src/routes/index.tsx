import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PostCard } from "#/components/PostCard";
import { posts, communities } from "#/lib/mock-data";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const sortedPosts = [...posts]
    .filter((p) => p.status === "published")
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const totalEvents = posts.filter((p) => p.isEvent).length;
  const totalCommunities = communities.length;

  return (
    <div className="space-y-24">
      {/* HERO */}
      <section className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div className="space-y-6">
          <div className="eyebrow">vboard · for VIT</div>
          <h1 className="display-xl text-balance" style={{ color: "var(--text)" }}>
            Everything happening on campus,{" "}
            <span style={{ color: "var(--brand)" }}>in one place.</span>
          </h1>
          <p
            className="max-w-[42ch] text-pretty text-[1.05rem] leading-[1.55]"
            style={{ color: "var(--text-dim)" }}
          >
            Clubs post events. You register with one tap. No more copy-pasted Google Forms in the
            WhatsApp group.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-sm)] font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em]"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Join vboard <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-sm)] font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em] border transition-colors hover:border-[var(--text)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              See the calendar
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-4 md:gap-6">
          <Stat label="Communities" value={totalCommunities} />
          <Stat label="Events" value={totalEvents} />
          <Stat label="Posts" value={posts.length} />
        </dl>
      </section>

      {/* DISCOVER */}
      <section className="space-y-8">
        <div className="flex items-end justify-between gap-6 hairline-bottom pb-5">
          <div className="space-y-3">
            <div className="eyebrow">Discover</div>
            <h2 className="display-md" style={{ color: "var(--text)" }}>
              Latest across vboard
            </h2>
          </div>
          <Link
            to="/calendar"
            className="hidden md:inline-flex font-mono text-[0.78rem] uppercase tracking-[0.06em] items-center gap-1.5 hover:text-[var(--brand)] transition-colors"
            style={{ color: "var(--text-dim)" }}
          >
            Calendar view <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {sortedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-2 surface p-5">
      <dt className="mono-label">{label}</dt>
      <dd className="text-3xl font-semibold tracking-[-0.04em]" style={{ color: "var(--text)" }}>
        {value}
      </dd>
    </div>
  );
}
