import { describe, expect, it } from "vitest";
import { assertEnv, missingRequired, optionalEnv, requiredEnv } from "@/lib/env";

describe("lib/env", () => {
    describe("requiredEnv", () => {
        it("returns the value when set", () => {
            process.env.DEVCART_TEST_VAR = "hello";
            expect(requiredEnv("DEVCART_TEST_VAR")).toBe("hello");
            delete process.env.DEVCART_TEST_VAR;
        });

        it("throws when the variable is missing", () => {
            delete process.env.DEVCART_TEST_VAR;
            expect(() => requiredEnv("DEVCART_TEST_VAR")).toThrow(
                "Missing required environment variable: DEVCART_TEST_VAR",
            );
        });

        it("throws when the variable is blank", () => {
            process.env.DEVCART_TEST_VAR = "   ";
            expect(() => requiredEnv("DEVCART_TEST_VAR")).toThrow();
            delete process.env.DEVCART_TEST_VAR;
        });
    });

    describe("optionalEnv", () => {
        it("returns the value when set", () => {
            process.env.DEVCART_OPT = "x";
            expect(optionalEnv("DEVCART_OPT")).toBe("x");
            delete process.env.DEVCART_OPT;
        });

        it("returns undefined when missing or blank", () => {
            expect(optionalEnv("DEVCART_MISSING")).toBeUndefined();
            process.env.DEVCART_OPT = "";
            expect(optionalEnv("DEVCART_OPT")).toBeUndefined();
            delete process.env.DEVCART_OPT;
        });
    });

    describe("missingRequired", () => {
        it("includes required vars that are absent", () => {
            const missing = missingRequired();
            expect(Array.isArray(missing)).toBe(true);
            expect(missing).toContain("DATABASE_URL");
            expect(missing).not.toContain("CURSOR_SECRET");
        });
    });

    describe("assertEnv", () => {
        it("throws when a required variable is missing", () => {
            delete process.env.DATABASE_URL;
            expect(() => assertEnv()).toThrow("Missing required environment variable");
        });
    });
});
