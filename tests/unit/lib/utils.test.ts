import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatPrice, getImageUrl } from "@/lib/utils";

describe("getImageUrl", () => {
    const originalHost = process.env.NEXT_PUBLIC_IMAGE_HOST;

    beforeEach(() => {
        process.env.NEXT_PUBLIC_IMAGE_HOST = "https://img.example.com";
    });

    afterEach(() => {
        if (originalHost === undefined) {
            delete process.env.NEXT_PUBLIC_IMAGE_HOST;
        } else {
            process.env.NEXT_PUBLIC_IMAGE_HOST = originalHost;
        }
    });

    it("prefixes the storage key with the configured image host", () => {
        expect(getImageUrl("uploads/user-1/cover.png")).toBe(
            "https://img.example.com/uploads/user-1/cover.png",
        );
    });

    it("returns the raw key when NEXT_PUBLIC_IMAGE_HOST is not set", () => {
        delete process.env.NEXT_PUBLIC_IMAGE_HOST;
        expect(getImageUrl("uploads/user-1/cover.png")).toBe("uploads/user-1/cover.png");
    });

    it("returns the raw key when NEXT_PUBLIC_IMAGE_HOST is empty", () => {
        process.env.NEXT_PUBLIC_IMAGE_HOST = "";
        expect(getImageUrl("key.png")).toBe("key.png");
    });
});

describe("formatPrice", () => {
    it.each([
        [0, "0.00"],
        [5, "0.05"],
        [1999, "19.99"],
        [100000, "1000.00"],
        [123456789, "1234567.89"],
    ])("formats %i cents as %s", (cents, expected) => {
        expect(formatPrice(cents)).toBe(expected);
    });
});
