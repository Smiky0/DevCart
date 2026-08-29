import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    constructEventAsync: vi.fn(),
    purchaseFindUnique: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
    stripe: { webhooks: { constructEventAsync: mocks.constructEventAsync } },
}));

vi.mock("@/lib/prisma", () => ({
    default: {
        purchase: { findUnique: mocks.purchaseFindUnique },
        $transaction: mocks.transaction,
    },
}));

import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { POST } from "@/app/api/webhooks/stripe/route";
import { decodeOrderItems, encodeOrderItems } from "@/lib/orderMetadata";

const sessionId = "cs_test_123";
const buyerId = "buyer-1";

const snapshot = [
    { productId: "p1", sellerId: "s1", amountCents: 1999 },
    { productId: "p2", sellerId: "s2", amountCents: 501 },
];

function buildMetadata(
    overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
    return {
        userId: buyerId,
        cartId: "cart-1",
        ...encodeOrderItems(snapshot),
        ...overrides,
    };
}

function buildSession(overrides: Record<string, unknown> = {}) {
    return {
        id: sessionId,
        payment_status: "paid",
        metadata: buildMetadata(),
        ...overrides,
    } as unknown as Stripe.Checkout.Session;
}

function completedEvent(session = buildSession()) {
    return {
        id: `evt_${sessionId}`,
        type: "checkout.session.completed",
        data: { object: session },
    } as unknown as Stripe.Event;
}

function makeRequest(headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        body: "stripe-payload",
        headers,
    });
}

describe("POST /api/webhooks/stripe", () => {
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

    beforeEach(() => {
        process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
        mocks.purchaseFindUnique.mockResolvedValue(null);
        mocks.transaction.mockImplementation(
            async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    purchase: { create: vi.fn().mockResolvedValue({ id: "purchase-1" }) },
                    cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
                }),
        );
    });

    afterEach(() => {
        if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
        else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });

    it("rejects requests without a signature header", async () => {
        const res = await POST(makeRequest());

        expect(res.status).toBe(400);
        expect(mocks.constructEventAsync).not.toHaveBeenCalled();
    });

    it("rejects payloads whose signature fails verification", async () => {
        mocks.constructEventAsync.mockRejectedValue(
            new Error("Signature verification failed"),
        );

        const res = await POST(makeRequest({ "stripe-signature": "tampered" }));

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({
            error: "Invalid webhook signature",
        });
        expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
    });

    it("acknowledges unrelated events without touching the database", async () => {
        mocks.constructEventAsync.mockResolvedValue({
            id: "evt_1",
            type: "charge.succeeded",
            data: { object: {} },
        } as unknown as Stripe.Event);

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ received: true });
        expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("ignores sessions that are not paid yet", async () => {
        mocks.constructEventAsync.mockResolvedValue(
            completedEvent(buildSession({ payment_status: "unpaid" })),
        );

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(200);
        expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("skips fulfillment when metadata is incomplete", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mocks.constructEventAsync.mockResolvedValue(
            completedEvent(
                buildSession({
                    metadata: encodeOrderItems(snapshot),
                }),
            ),
        );

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(200);
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalled();
    });

    it("skips fulfillment when the item snapshot is missing or invalid", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mocks.constructEventAsync.mockResolvedValue(
            completedEvent(
                buildSession({
                    metadata: { userId: buyerId, cartId: "cart-1" },
                }),
            ),
        );

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(200);
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(decodeOrderItems({ userId: buyerId })).toBeNull();
        expect(consoleError).toHaveBeenCalled();
    });

    it("fulfills paid sessions from the checkout-time snapshot", async () => {
        mocks.constructEventAsync.mockResolvedValue(completedEvent());
        const txPurchaseCreate = vi.fn().mockResolvedValue({ id: "purchase-9" });
        const txCartDelete = vi.fn().mockResolvedValue({ count: 2 });
        mocks.transaction.mockImplementation(
            async (fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    purchase: { create: txPurchaseCreate },
                    cartItem: { deleteMany: txCartDelete },
                }),
        );

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ received: true });
        expect(mocks.purchaseFindUnique).toHaveBeenCalledWith({
            where: { stripeSessionId: sessionId },
            select: { id: true },
        });
        expect(txPurchaseCreate).toHaveBeenCalledWith({
            data: {
                buyerId,
                stripeSessionId: sessionId,
                totalAmount: 2500,
                items: {
                    create: [
                        { productId: "p1", sellerId: "s1", price: 1999 },
                        { productId: "p2", sellerId: "s2", price: 501 },
                    ],
                },
            },
        });
        expect(txCartDelete).toHaveBeenCalledWith({
            where: {
                cartId: "cart-1",
                productId: { in: ["p1", "p2"] },
            },
        });
    });

    it("is a no-op when the session was already fulfilled (replay)", async () => {
        mocks.constructEventAsync.mockResolvedValue(completedEvent());
        mocks.purchaseFindUnique.mockResolvedValue({ id: "purchase-existing" });

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ received: true });
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("treats unique-constraint races as success so Stripe stops retrying", async () => {
        mocks.constructEventAsync.mockResolvedValue(completedEvent());
        mocks.transaction.mockRejectedValue({ code: "P2002" });

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ received: true });
    });

    it("returns 500 on unexpected fulfillment failures so Stripe retries", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mocks.constructEventAsync.mockResolvedValue(completedEvent());
        mocks.transaction.mockRejectedValue(new Error("db down"));

        const res = await POST(makeRequest({ "stripe-signature": "valid" }));

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
            error: "Webhook processing failed",
        });
        expect(consoleError).toHaveBeenCalled();
    });
});
