import type { NextConfig } from "next"

if (process.env.NODE_ENV === "production" && process.env.VBOARD_DEV_AUTH) {
  throw new Error(
    "VBOARD_DEV_AUTH is set for a production build. It bypasses sign-in and " +
      "must never be present in anything deployable.\n" +
      "Build without it: VBOARD_DEV_AUTH= npm run build\n"
  )
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  experimental: { serverActions: { bodySizeLimit: "5mb" } },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
