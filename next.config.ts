import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com/**",
            },
            {
                protocol: "https",
                hostname: "*.r2.dev",
            },
        ],
    },
    // optimize for phospohorus icon to load only modules that are used
    experimental: {
        optimizePackageImports: ["@phosphor-icons/react"],
        serverActions: {
            bodySizeLimit: "10mb",
        },
    },
};

export default nextConfig;
