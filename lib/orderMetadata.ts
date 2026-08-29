/**
 * Helpers to persist an immutable snapshot of the purchased items inside
 * Stripe Checkout session metadata.
 *
 * Why a snapshot: fulfillment must be based on what the buyer actually paid
 * for at checkout time — not whatever happens to be in their cart when the
 * payment completes (cart items can change while the payment is in flight).
 *
 * Stripe limits each metadata value to 500 characters, so the serialized
 * snapshot is split into numbered chunks (`items_0`, `items_1`, ...).
 */

export interface OrderSnapshotItem {
    productId: string;
    sellerId: string;
    amountCents: number;
}

const MAX_VALUE_LENGTH = 480;

export function encodeOrderItems(items: OrderSnapshotItem[]): Record<string, string> {
    const json = JSON.stringify(items);
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += MAX_VALUE_LENGTH) {
        chunks.push(json.slice(i, i + MAX_VALUE_LENGTH));
    }
    return Object.fromEntries(chunks.map((chunk, index) => [`items_${index}`, chunk]));
}

function isValidSnapshotItem(value: unknown): value is OrderSnapshotItem {
    if (typeof value !== "object" || value === null) return false;
    const item = value as Record<string, unknown>;
    return (
        typeof item.productId === "string" &&
        item.productId.length > 0 &&
        typeof item.sellerId === "string" &&
        item.sellerId.length > 0 &&
        typeof item.amountCents === "number" &&
        Number.isInteger(item.amountCents) &&
        item.amountCents > 0
    );
}

export function decodeOrderItems(
    metadata: Record<string, string | undefined>,
): OrderSnapshotItem[] | null {
    const keys = Object.keys(metadata)
        .filter((key) => /^items_\d+$/.test(key))
        .sort(
            (a, b) => Number(a.slice("items_".length)) - Number(b.slice("items_".length)),
        );
    if (keys.length === 0) return null;

    try {
        const parsed: unknown = JSON.parse(keys.map((key) => metadata[key]).join(""));
        if (
            !Array.isArray(parsed) ||
            parsed.length === 0 ||
            !parsed.every(isValidSnapshotItem)
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}
