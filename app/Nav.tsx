import Link from "next/link";
import { ThemeToggle } from "@/app/ThemeToggle";

const LINKS = [
  { href: "/", label: "Imports" },
  { href: "/globe", label: "Globe" },
  { href: "/ru-trade-timeline", label: "RU Trade Timeline" },
];

/** Top nav linking the app's three pages, with the theme toggle pinned to
 *  the far right. Plain links — no active-state highlighting, kept minimal. */
export function Nav() {
  return (
    <nav className="flex items-center gap-4 border-b border-border px-6 py-3 text-sm">
      {LINKS.map((l) => (
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
