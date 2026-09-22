import withPWAInit from "next-pwa";

// Disabled in dev: a service worker caching JS chunks during development
// fights the dev server's hot-reload/recompile cycle badly. Test PWA/offline
// behavior against a production build (`npm run build && npm run start`).
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
