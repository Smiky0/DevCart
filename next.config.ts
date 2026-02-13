import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "images.unsplash.com/**",
            },
        ],
    },
    // optimize for phospohorus icon to load only modules that are used
    experimental: {
        optimizePackageImports: ["@phosphor-icons/react"],
    },
};

export default nextConfig;
