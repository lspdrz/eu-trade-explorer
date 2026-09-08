import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// IBM Plex Sans: an engineered, institutional face built for technical and
// data contexts — a deliberate fit for customs trade statistics, and not the
// Inter/Geist default. One family, three weights.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "EU Fertilizer Imports",
  description:
    "Where the EU's ammonia and nitrogen fertilizer comes from — customs import volumes by partner country.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={plexSans.variable}>
      <body>{children}</body>
    </html>
  );
}
