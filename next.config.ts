import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets `next dev` be reached from another device on the same LAN (e.g. a
  // phone, for real touch/pinch testing) — without this, Next.js's default
  // dev-only cross-origin protection silently blocks the HMR websocket and
  // can cascade into remounts that never let client-side data (like the
  // globe's topology fetch) settle. Dev-only; irrelevant to the Vercel
  // deployment. Set DEV_LAN_ORIGIN in .env.local to your machine's current
  // LAN IP (e.g. `ipconfig getifaddr en0` on macOS) — a per-machine,
  // per-network value, so it lives in .env.local (gitignored), not here.
  // Left undefined (the default) this is a no-op.
  allowedDevOrigins: process.env.DEV_LAN_ORIGIN ? [process.env.DEV_LAN_ORIGIN] : undefined,
};

export default nextConfig;
