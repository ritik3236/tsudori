import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables the forbidden()/unauthorized() interrupts so a permission-denied
    // page renders our friendly forbidden.tsx (403) instead of bubbling a raw
    // 500 "This page couldn't load" screen. See src/lib/tenant.ts.
    authInterrupts: true,
  },
};

export default nextConfig;
