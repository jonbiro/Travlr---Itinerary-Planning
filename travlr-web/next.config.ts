import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    const scriptSources = [
      "'self'",
      "'unsafe-inline'",
      ...(isProduction ? [] : ["'unsafe-eval'"]),
      "https://maps.googleapis.com",
      "https://maps.gstatic.com",
      "https://*.googleapis.com",
    ].join(" ");

    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src ${scriptSources}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://*.gstatic.com https://*.googleusercontent.com https://*.ggpht.com https://*.google.com https://*.googleapis.com",
      "frame-src 'self' https://accounts.google.com",
      "form-action 'self' https://accounts.google.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ...(isProduction
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
