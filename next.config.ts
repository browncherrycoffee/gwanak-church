import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.youtube.com; font-src 'self' https://fonts.gstatic.com; frame-src https://www.youtube.com; connect-src 'self' https://*.vercel.app",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // HTML 페이지: 항상 최신 JS 번들 로드 (iOS bfcache 방지)
        source: "/((?!_next/static|_next/image|favicon|data/).*)",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        // 정적 에셋: 보안 헤더만 (캐시는 Next.js 기본값 유지)
        source: "/_next/static/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
