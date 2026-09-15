"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/app/_constants/navLinks";
import { ThemeToggle } from "@/app/_components/ThemeToggle";

/** Top nav linking the app's three pages, with the theme toggle pinned to
 *  the far right. The link matching the current route gets an underline. */
export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 border-b border-border px-6 py-3 text-sm">
      {NAV_LINKS.map((l) => {
        const isActive = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive ? "page" : undefined}
            className={`border-b-2 pb-1 ${
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </nav>
  );
}
