import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "#/components/PostCard";
import { getCommunityBySlug, getPostsForCommunity } from "#/lib/mock-data";

export const Route = createFileRoute("/communities/$slug")({
  component: CommunityDetail,
  loader: ({ params }) => {
    const community = getCommunityBySlug(params.slug);
    if (!community) throw notFound();
    const communityPosts = getPostsForCommunity(community.id);
    return { community, posts: communityPosts };
  },
});

function CommunityDetail() {
  const { community, posts } = Route.useLoaderData();
  const events = posts.filter((p) => p.isEvent).length;

  return (
    <div className="space-y-12">
      <Link
        to="/communities"
        className="inline-flex items-center gap-1.5 font-mono text-[0.78rem] uppercase tracking-[0.06em] hover:text-[var(--brand)] transition-colors"
        style={{ color: "var(--text-dim)" }}
      >
        <ArrowLeft className="size-3.5" /> All communities
      </Link>

      <header className="space-y-7 hairline-bottom pb-10">
        <div className="flex items-start gap-5">
          <div
            className="grid size-14 place-items-center rounded-[var(--radius)] font-mono text-xl font-semibold"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            {community.name.charAt(0)}
          </div>
          <div className="flex-1 space-y-2">
            <div className="eyebrow">Community</div>
            <h1 className="display-xl" style={{ color: "var(--text)" }}>
              {community.name}
            </h1>
          </div>
        </div>

        <p
          className="max-w-[60ch] text-[1.05rem] leading-[1.55]"
          style={{ color: "var(--text-dim)" }}
        >
          {community.description}
        </p>

        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[0.78rem]"
          style={{ color: "var(--text-dim)" }}
        >
          <Stat label="Members" value={community.memberCount} />
          <Stat label="Posts" value={posts.length} />
          <Stat label="Events" value={events} />
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em]"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          Follow community
        </button>
      </header>

      <section className="space-y-6">
        <div className="space-y-2">
          <div className="eyebrow">Posts and events</div>
          <h2 className="display-md" style={{ color: "var(--text)" }}>
            From {community.name}
          </h2>
        </div>

        {posts.length === 0 ? (
          <div
            className="surface p-10 text-center font-mono text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No posts yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
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
