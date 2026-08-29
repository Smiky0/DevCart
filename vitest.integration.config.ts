import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        globals: false,
        clearMocks: true,
        include: ["tests/integration/**/*.test.ts"],
        testTimeout: 60_000,
        hookTimeout: 180_000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
