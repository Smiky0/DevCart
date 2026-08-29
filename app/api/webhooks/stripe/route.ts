import prisma from "@/lib/prisma";
import { decodeOrderItems } from "@/lib/orderMetadata";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

/**
 * Stripe webhook fulfillment.
 *
 * Orders are fulfilled exclusively here — driven by Stripe's signed event —
 * and strictly from the item snapshot captured at checkout time. This means:
 * - buyers who never return to /checkout/results still get their products;
 * - items added to the cart after checkout can never be "fulfilled" unpaid.
 * Replays are safe: a Purchase row is keyed by the Stripe session id.
 */
export async function POST(request: NextRequest) {
    const signature = request.headers.get("stripe-signature");
    const payload = await request.text();

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = await stripe.webhooks.constructEventAsync(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET,
        );
    } catch {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
    ) {
        try {
            await fulfillCheckoutSession(event.data.object);
        } catch (err) {
            // Return a 5xx so Stripe retries this delivery.
            console.error(`Failed to fulfill Stripe session:`, err);
            return NextResponse.json(
                { error: "Webhook processing failed" },
                { status: 500 },
            );
        }
    }

    return NextResponse.json({ received: true });
}

async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
    const sessionId = session.id;
    const userId = session.metadata?.userId;
    const cartId = session.metadata?.cartId;

    if (!userId || !cartId) {
        console.error(`Stripe session ${sessionId} has incomplete metadata`);
        return;
    }

    if (session.payment_status !== "paid") {
        return;
    }

    const snapshot = decodeOrderItems(session.metadata ?? {});
    if (!snapshot || snapshot.length === 0) {
        console.error(
            `Stripe session ${sessionId} has no valid item snapshot; skipping fulfillment`,
        );
        return;
    }

    // Fast path: already fulfilled by an earlier delivery of this event.
    const existing = await prisma.purchase.findUnique({
        where: { stripeSessionId: sessionId },
        select: { id: true },
    });
    if (existing) {
        return;
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.purchase.create({
                data: {
                    buyerId: userId,
                    stripeSessionId: sessionId,
                    // snapshot amounts are already integer cents
                    totalAmount: snapshot.reduce((sum, i) => sum + i.amountCents, 0),
                    items: {
                        create: snapshot.map((item) => ({
                            productId: item.productId,
                            sellerId: item.sellerId,
                            price: item.amountCents,
                        })),
                    },
                },
            });

            // Clear only the purchased lines from the cart; anything added
            // after checkout stays put.
            await tx.cartItem.deleteMany({
                where: {
                    cartId,
                    productId: { in: snapshot.map((i) => i.productId) },
                },
            });
        });
    } catch (err) {
        // Concurrent duplicate delivery lost the race on the unique key —
        // the order is already fulfilled, treat as success.
        if ((err as { code?: string })?.code === "P2002") {
            return;
        }
        throw err;
    }
}
