import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-6 text-center">
        <div className="eyebrow justify-center" style={{ display: "inline-flex" }}>
          Under construction
        </div>
        <h1 className="display-xl" style={{ color: "var(--text)" }}>
          Sign in
        </h1>
        <p className="mx-auto max-w-[36ch] text-[1rem]" style={{ color: "var(--text-dim)" }}>
          We're building this. Check back soon.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-sm)] font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em]"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            Back to discover <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
