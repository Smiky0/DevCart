import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const userId = session.user.id;

        // Fetch the user's cart with items
        const userCart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });

        if (!userCart || userCart.items.length === 0) {
            return NextResponse.json(
                { error: "Cart is empty" },
                { status: 400 },
            );
        }

        // Build Stripe line items from cart
        const lineItems = userCart.items.map((item) => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.product.title,
                    ...(item.product.images[0] && {
                        images: [item.product.images[0]],
                    }),
                },
                unit_amount: Math.round(item.product.price * 100), // Stripe expects cents
            },
            quantity: 1,
        }));

        // Create Stripe Checkout Session
        const stripeSession = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: lineItems,
            metadata: {
                userId,
                cartId: userCart.id,
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/results?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
        });

        return NextResponse.json({ url: stripeSession.url });
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 },
        );
    }
}
