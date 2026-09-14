/** The app's top-nav links, in display order. Shared with Nav's test so the
 *  link count can't drift silently out of sync between the two. */
export const NAV_LINKS = [
  { href: "/", label: "Imports" },
  { href: "/globe", label: "Globe" },
  { href: "/ru-trade-timeline", label: "RU Trade Timeline" },
] as const;
