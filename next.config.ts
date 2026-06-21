import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables the forbidden()/unauthorized() interrupts so a permission-denied
    // page renders our friendly forbidden.tsx (403) instead of bubbling a raw
    // 500 "This page couldn't load" screen. See src/lib/tenant.ts.
    authInterrupts: true,
  },
  // Baseline security headers on every route. Most important for the credential
  // surfaces (/auth/*, /invite/*): frame-ancestors/X-Frame-Options stop the
  // sign-in and invite-accept forms being framed for clickjacking, and
  // Referrer-Policy keeps the invite token in the URL path from leaking via the
  // Referer header to third-party subresources.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
