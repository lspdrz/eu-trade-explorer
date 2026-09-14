import Link from "next/link";
import { NAV_LINKS } from "@/app/_constants/navLinks";
import { ThemeToggle } from "@/app/_components/ThemeToggle";

/** Top nav linking the app's three pages, with the theme toggle pinned to
 *  the far right. Plain links — no active-state highlighting, kept minimal. */
export function Nav() {
  return (
    <nav className="flex items-center gap-4 border-b border-border px-6 py-3 text-sm">
      {NAV_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="text-muted hover:text-foreground">
          {l.label}
        </Link>
      ))}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </nav>
  );
}
