const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nexttour/shared"],
  // Proxies /api/* to the Express API so the browser only ever talks to this
  // app's own origin. The auth cookie is genuinely cross-site otherwise (this
  // app and the API are on different domains) — Safari's Intelligent Tracking
  // Prevention silently drops such cookies even with SameSite=None; Secure,
  // which satisfies the spec but not Safari's stricter-than-spec ITP rules.
  // Routing through this origin makes the cookie first-party everywhere.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*` }];
  },
};

export default nextConfig;
