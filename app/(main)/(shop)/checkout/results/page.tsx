import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CheckoutResultsPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>;
}) {
    const { session_id } = await searchParams;

    if (!session_id) {
        return redirect("/cart");
    }

    let session;
    try {
        session = await stripe.checkout.sessions.retrieve(session_id);
    } catch {
        return redirect("/cart");
    }

    const isSuccess = session.payment_status === "paid";

    // If payment succeeded, fulfill the order
    if (isSuccess && session.metadata?.userId && session.metadata?.cartId) {
        const { userId, cartId } = session.metadata;

        // Check if cart still has items (prevents double-processing on refresh)
        const cartItems = await prisma.cartItem.findMany({
            where: { cartId },
            include: { product: true },
        });

        if (cartItems.length > 0) {
            const totalAmount = cartItems.reduce(
                (sum, item) => sum + item.product.price,
                0,
            );

            await prisma.$transaction(async (tx) => {
                await tx.purchase.create({
                    data: {
                        buyerId: userId,
                        totalAmount,
                        items: {
                            create: cartItems.map((item) => ({
                                productId: item.productId,
                                sellerId: item.product.sellerId,
                                price: item.product.price,
                            })),
                        },
                    },
                });

                await tx.cartItem.deleteMany({
                    where: { cartId },
                });
            });
        }
    }

    return (
        <div className="py-16 text-center animate-fade-in-up">
            {isSuccess ?
                <>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
                        <span className="text-4xl">&#10003;</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-3">
                        Purchase Complete!
                    </h1>
                    <p className="text-lg text-muted max-w-md mx-auto mb-8">
                        Thank you for your purchase. Your digital products are
                        now available for download.
                    </p>
                    <Link
                        href="/orders"
                        className="inline-block rounded-xl bg-primary/90 hover:bg-primary px-6 py-3 font-bold text-sm text-surface transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                        Go to Orders
                    </Link>
                </>
            :   <>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center">
                        <span className="text-4xl">&#10007;</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-3">
                        Payment Failed
                    </h1>
                    <p className="text-lg text-muted max-w-md mx-auto mb-8">
                        Something went wrong with your payment. Please try
                        again.
                    </p>
                    <Link
                        href="/cart"
                        className="inline-block rounded-xl bg-primary/90 hover:bg-primary px-6 py-3 font-bold text-sm text-surface transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                        Return to Cart
                    </Link>
                </>
            }
        </div>
    );
}
