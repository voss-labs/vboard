import { createFileRoute } from "@tanstack/react-router";
import { UnderConstruction } from "#/components/UnderConstruction";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  return (
    <div className="space-y-10">
      <header className="space-y-3 hairline-bottom pb-7">
        <div className="eyebrow">Profile</div>
        <h1 className="display-xl" style={{ color: "var(--text)" }}>
          Your profile
        </h1>
        <p className="max-w-[52ch] text-[1rem] leading-[1.55]" style={{ color: "var(--text-dim)" }}>
          Roll number, department, posts you've authored, events you've registered for.
        </p>
      </header>

      <UnderConstruction
        phase="Phase 1"
        title="Profile management"
        description="Your account details, the events you've signed up for, the posts you've authored, the communities you belong to. Lands with auth in Phase 1."
        upcoming={[
          "Edit name, roll number, department, bio",
          "Avatar upload to Cloudflare R2",
          "Posts you've authored",
          "Events you're registered for, with status",
          "Communities you're a member of",
          "Account settings: change password, sign out everywhere",
        ]}
      />
    </div>
  );
}
