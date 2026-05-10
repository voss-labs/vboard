import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="hairline-top mt-32">
      <div className="container">
        <div className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-end gap-1.5">
            <span
              className="text-base font-extrabold tracking-[-0.045em] leading-none"
              style={{ color: "var(--text)" }}
            >
              vboard
            </span>
            <span
              className="block size-2 mb-[2px]"
              style={{ background: "var(--brand-pure)" }}
              aria-hidden
            />
            <span className="ml-3 text-sm" style={{ color: "var(--text-dim)" }}>
              Events and community for VIT.
            </span>
          </div>

          <nav className="flex items-center gap-6 mono-label">
            <Link to="/" className="hover:text-[var(--text)]">
              Discover
            </Link>
            <Link to="/calendar" className="hover:text-[var(--text)]">
              Calendar
            </Link>
            <Link to="/communities" className="hover:text-[var(--text)]">
              Communities
            </Link>
            <a
              href="https://github.com/voss-labs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text)]"
            >
              GitHub →
            </a>
          </nav>
        </div>

        <div
          className="flex items-center justify-between py-6 text-xs hairline-top"
          style={{ color: "var(--text-muted)" }}
        >
          <span>vosslabs · {new Date().getFullYear()}</span>
          <span className="font-mono">MIT</span>
        </div>
      </div>
    </footer>
  );
}
