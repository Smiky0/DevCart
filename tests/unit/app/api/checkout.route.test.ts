import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    cartFindUnique: vi.fn(),
    stripeCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/prisma", () => ({
    default: { cart: { findUnique: mocks.cartFindUnique } },
}));

vi.mock("@/lib/stripe", () => ({
    stripe: { checkout: { sessions: { create: mocks.stripeCreate } } },
}));

import { encodeOrderItems } from "@/lib/orderMetadata";
import { POST } from "@/app/api/checkout/route";

const userId = "user-1";
const session = { user: { id: userId } };

function makeCart(
    items: {
        title: string;
        price: number;
        images?: string[];
    }[],
) {
    return {
        id: "cart-1",
        userId,
        items: items.map((item, i) => ({
            id: `ci-${i}`,
            productId: `product-${i}`,
            product: {
                id: `product-${i}`,
                sellerId: `seller-${i}`,
                title: item.title,
                price: item.price,
                images: item.images ?? [],
            },
        })),
    };
}

function callPost() {
    return POST();
}

describe("POST /api/checkout", () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    beforeEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = "https://devcart.example.com";
        mocks.auth.mockResolvedValue(session);
        mocks.stripeCreate.mockResolvedValue({
            url: "https://checkout.stripe.com/session/abc",
        });
    });

    afterEach(() => {
        if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
        else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    });

    it("returns 401 for unauthenticated requests", async () => {
        mocks.auth.mockResolvedValue(null);

        const res = await callPost();

        expect(res.status).toBe(401);
        expect(mocks.stripeCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when the user has no cart", async () => {
        mocks.cartFindUnique.mockResolvedValue(null);

        const res = await callPost();

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "Cart is empty" });
    });

    it("returns 400 when the cart has no items", async () => {
        mocks.cartFindUnique.mockResolvedValue(makeCart([]));

        const res = await callPost();

        expect(res.status).toBe(400);
    });

    it("creates a payment-mode session with one line item per cart product", async () => {
        mocks.cartFindUnique.mockResolvedValue(
            makeCart([
                { title: "UI Kit", price: 1999, images: ["img-a.png"] },
                { title: "Icon Pack", price: 500 },
            ]),
        );

        const res = await callPost();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            url: "https://checkout.stripe.com/session/abc",
        });
        expect(mocks.stripeCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "payment",
                payment_method_types: ["card"],
                metadata: expect.objectContaining({
                    userId,
                    cartId: "cart-1",
                }),
            }),
        );

        const args = mocks.stripeCreate.mock.calls[0][0];
        expect(args.line_items).toHaveLength(2);
        expect(args.line_items[0]).toEqual({
            price_data: {
                currency: "usd",
                product_data: {
                    name: "UI Kit",
                    images: ["img-a.png"],
                },
                unit_amount: 1999,
            },
            quantity: 1,
        });
        expect(args.line_items[1].price_data.product_data).toEqual({
            name: "Icon Pack",
        });
        expect(args.metadata).toEqual({
            userId,
            cartId: "cart-1",
            ...encodeOrderItems([
                { productId: "product-0", sellerId: "seller-0", amountCents: 1999 },
                { productId: "product-1", sellerId: "seller-1", amountCents: 500 },
            ]),
        });
        expect(args.success_url).toBe(
            "https://devcart.example.com/checkout/results?session_id={CHECKOUT_SESSION_ID}",
        );
        expect(args.cancel_url).toBe("https://devcart.example.com/cart");
    });

    it("passes stored cent prices through to Stripe without conversion", async () => {
        mocks.cartFindUnique.mockResolvedValue(makeCart([{ title: "A", price: 12345 }]));

        await callPost();

        const args = mocks.stripeCreate.mock.calls[0][0];
        expect(args.line_items[0].price_data.unit_amount).toBe(12345);
    });

    it("returns 500 when Stripe fails", async () => {
        mocks.cartFindUnique.mockResolvedValue(makeCart([{ title: "A", price: 1000 }]));
        mocks.stripeCreate.mockRejectedValue(new Error("stripe down"));

        const res = await callPost();

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
            error: "Failed to create checkout session",
        });
    });
});
