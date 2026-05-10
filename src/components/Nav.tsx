import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "#/lib/utils";

const navLinks = [
  { to: "/", label: "Discover" },
  { to: "/calendar", label: "Calendar" },
  { to: "/communities", label: "Communities" },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        "border-b border-[var(--border)]",
        scrolled ? "bg-[var(--bg)]" : "bg-transparent",
      )}
    >
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-end gap-1.5" aria-label="vboard home">
            <span
              className="text-[1.25rem] font-extrabold tracking-[-0.045em] leading-none"
              style={{ color: "var(--text)" }}
            >
              vboard
            </span>
            <span
              className="block size-2.5 mb-[3px]"
              style={{ background: "var(--brand-pure)" }}
              aria-hidden
            />
          </Link>

          <ul className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  activeProps={{ "data-active": "true" } as never}
                  activeOptions={{ exact: link.to === "/" }}
                  className="relative inline-block font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em] py-1.5 transition-colors data-[active=true]:text-[var(--brand)] data-[active=true]:after:absolute data-[active=true]:after:left-0 data-[active=true]:after:right-0 data-[active=true]:after:bottom-0 data-[active=true]:after:h-[2px] data-[active=true]:after:bg-[var(--brand)] hover:text-[var(--text)]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li aria-hidden className="h-4 w-px mx-1" style={{ background: "var(--border)" }} />
            <li>
              <Link
                to="/login"
                className="font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em] hover:text-[var(--brand)] transition-colors"
                style={{ color: "var(--text-dim)" }}
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em] px-4 py-2 rounded-[var(--radius-sm)] transition-colors"
                style={{
                  background: "var(--text)",
                  color: "var(--bg)",
                }}
              >
                Join <span aria-hidden>→</span>
              </Link>
            </li>
          </ul>

          <Link
            to="/signup"
            className="md:hidden font-mono text-[0.78rem] font-medium uppercase tracking-[0.06em] px-3 py-1.5 rounded-[var(--radius-sm)]"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            Join
          </Link>
        </div>
      </div>
    </nav>
  );
}
