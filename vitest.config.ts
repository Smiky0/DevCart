import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
    test: {
        environment: "node",
        include: ["tests/unit/**/*.test.ts"],
        clearMocks: true,
        coverage: {
            provider: "v8",
            include: ["lib/**/*.ts", "server/**/*.ts", "app/api/**/*.ts"],
            reporter: ["text", "html"],
        },
    },
});
