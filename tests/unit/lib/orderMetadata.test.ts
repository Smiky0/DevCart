import { describe, expect, it } from "vitest";
import {
    decodeOrderItems,
    encodeOrderItems,
    type OrderSnapshotItem,
} from "@/lib/orderMetadata";

function makeItems(count: number): OrderSnapshotItem[] {
    return Array.from({ length: count }, (_, i) => ({
        productId: `product-${i}-cuid000000000000000000000000`,
        sellerId: `seller-${i}-cuid000000000000000000000000`,
        amountCents: 1000 + i,
    }));
}

describe("encodeOrderItems", () => {
    it("fits small snapshots into a single chunk", () => {
        const encoded = encodeOrderItems(makeItems(2));

        expect(Object.keys(encoded)).toEqual(["items_0"]);
        expect(encoded.items_0!.length).toBeLessThanOrEqual(480);
    });

    it("splits large snapshots into ordered chunks within Stripe's limit", () => {
        const encoded = encodeOrderItems(makeItems(30));

        const keys = Object.keys(encoded);
        expect(keys.length).toBeGreaterThan(1);
        expect(keys).toEqual(keys.map((_, i) => `items_${i}`));
        for (const value of Object.values(encoded)) {
            expect(value.length).toBeLessThanOrEqual(480);
        }
    });
});

describe("decodeOrderItems", () => {
    it("round-trips a small snapshot", () => {
        const items = makeItems(2);

        const decoded = decodeOrderItems(encodeOrderItems(items));

        expect(decoded).toEqual(items);
    });

    it("round-trips a large multi-chunk snapshot in numeric key order", () => {
        const items = makeItems(30);

        const decoded = decodeOrderItems(encodeOrderItems(items));

        expect(decoded).toEqual(items);
    });

    it("returns null when there are no item chunks", () => {
        expect(decodeOrderItems({ userId: "u1" })).toBeNull();
        expect(decodeOrderItems({})).toBeNull();
    });

    it("returns null for corrupted JSON", () => {
        expect(decodeOrderItems({ items_0: "{not valid json" })).toBeNull();
    });

    it("rejects entries with missing or invalid fields", () => {
        const invalid: unknown[] = [
            [{ productId: "", sellerId: "s", amountCents: 100 }],
            [{ productId: "p", sellerId: "", amountCents: 100 }],
            [{ productId: "p", sellerId: "s", amountCents: -5 }],
            [{ productId: "p", sellerId: "s", amountCents: 1.5 }],
            [{ productId: "p", sellerId: "s", amountCents: "100" }],
            ["nope"],
            [null],
            [],
        ];

        for (const payload of invalid) {
            expect(decodeOrderItems({ items_0: JSON.stringify(payload) })).toBeNull();
        }
    });

    it("accepts only well-formed positive integer amounts", () => {
        const decoded = decodeOrderItems({
            items_0: JSON.stringify([{ productId: "p", sellerId: "s", amountCents: 99 }]),
        });

        expect(decoded).toEqual([{ productId: "p", sellerId: "s", amountCents: 99 }]);
    });
});
