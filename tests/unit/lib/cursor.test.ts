import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "@/lib/cursor";

const payload = { u: "2026-08-22T10:00:00.000Z", i: "prod_abc123" };
const SECRET = "test-cursor-secret";

describe("cursor signing", () => {
    const originalCursorSecret = process.env.CURSOR_SECRET;
    const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

    beforeEach(() => {
        process.env.CURSOR_SECRET = SECRET;
    });

    afterEach(() => {
        if (originalCursorSecret === undefined) delete process.env.CURSOR_SECRET;
        else process.env.CURSOR_SECRET = originalCursorSecret;

        if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
        else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
    });

    it("round-trips a valid payload", () => {
        expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
    });

    it("produces different signatures for different payloads", () => {
        expect(encodeCursor(payload)).not.toBe(
            encodeCursor({ ...payload, i: "prod_other" }),
        );
    });

    it("is deterministic for the same payload", () => {
        expect(encodeCursor(payload)).toBe(encodeCursor(payload));
    });
});

function signWith(secret: string, body: string): string {
    return createHmac("sha256", secret).update(`v1.${body}`).digest("base64url");
}

function craft(payloadObject: unknown, secret = SECRET): string {
    const body = Buffer.from(JSON.stringify(payloadObject), "utf8").toString("base64url");
    return `v1.${body}.${signWith(secret, body)}`;
}

describe("decodeCursor rejects tampered or malformed cursors", () => {
    beforeEach(() => {
        process.env.CURSOR_SECRET = SECRET;
        delete process.env.NEXTAUTH_SECRET;
    });

    it.each([null, undefined, 123, "", "garbage", "v1.onlybody", "v2.abc.def"])(
        "rejects invalid cursor input: %s",
        (input) => {
            expect(decodeCursor(input)).toBeNull();
        },
    );

    it("rejects a tampered signature", () => {
        const cursor = encodeCursor(payload);
        const [, body] = cursor.split(".");
        expect(decodeCursor(`v1.${body}.definitely-not-the-right-sig`)).toBeNull();
    });

    it("rejects a tampered payload re-signed by an attacker", () => {
        // attacker flips the id but can't produce a valid signature
        // without the secret
        const cursor = encodeCursor(payload);
        const [, , originalSig] = cursor.split(".");
        const attackerBody = Buffer.from(
            JSON.stringify({ u: "2030-01-01T00:00:00.000Z", i: "admin" }),
            "utf8",
        ).toString("base64url");
        expect(decodeCursor(`v1.${attackerBody}.${originalSig}`)).toBeNull();
    });

    it("rejects a validly-shaped cursor signed with the wrong secret", () => {
        expect(decodeCursor(craft(payload, "attacker-secret"))).toBeNull();
    });

    it("rejects correctly-signed payloads with invalid fields", () => {
        expect(decodeCursor(craft({ nope: true }))).toBeNull();
        expect(decodeCursor(craft({ u: "not-a-date", i: "prod_1" }))).toBeNull();
        expect(decodeCursor(craft({ u: payload.u, i: "" }))).toBeNull();
        expect(decodeCursor(craft({ u: payload.u, i: "x".repeat(65) }))).toBeNull();
    });

    it("accepts cursors signed via the NEXTAUTH_SECRET fallback", () => {
        delete process.env.CURSOR_SECRET;
        process.env.NEXTAUTH_SECRET = "fallback-secret";
        expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
    });
});
