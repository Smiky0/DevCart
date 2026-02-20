import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function CheckoutPage() {
    const session = await auth();
    if (!session?.user?.id) {
        return redirect("/api/auth/signin");
    }

    const userCart = await prisma.cart.findUnique({
        where: { userId: session.user.id },
        include: {
            items: {
                include: { product: true },
            },
        },
    });

    if (!userCart || userCart.items.length === 0) {
        return redirect("/cart");
    }

    const totalPrice = userCart.items.reduce(
        (sum, item) => sum + item.product.price,
        0,
    );

    return (
        <div className="py-6 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-foreground mb-8">
                Checkout
            </h1>
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Order Summary */}
                <div className="flex-1 bg-surface border border-border/60 rounded-2xl p-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-6">
                        Order Summary
                    </h2>
                    <div className="space-y-4">
                        {userCart.items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 rounded-xl bg-background/50"
                            >
                                {item.product.images[0] && (
                                    <Image
                                        src={getImageUrl(
                                            item.product.images[0],
                                        )}
                                        alt={item.product.title}
                                        className="w-14 h-14 object-cover rounded-lg"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                        {item.product.title}
                                    </p>
                                    <p className="text-xs text-muted capitalize">
                                        {item.product.category}
                                    </p>
                                </div>
                                <span className="font-semibold text-foreground">
                                    ${item.product.price.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Sidebar */}
                <div className="w-full lg:w-80 bg-surface border border-border/60 rounded-2xl p-8 shadow-sm h-fit">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Payment
                    </h2>
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm text-muted">
                            <span>Items ({userCart.items.length})</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-border/60 pt-3 flex justify-between font-bold text-foreground">
                            <span>Total</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                    <CheckoutButton />
                    <Link
                        href="/cart"
                        className="block text-center text-sm text-muted hover:text-foreground mt-3 transition-colors"
                    >
                        Return to cart
                    </Link>
                </div>
            </div>
        </div>
    );
}

function CheckoutButton() {
    return (
        <form action="/api/checkout" method="POST">
            <button
                type="submit"
                className="w-full rounded-xl bg-primary/90 hover:bg-primary px-6 py-3 font-bold text-sm text-surface cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-md"
            >
                Proceed to Payment
            </button>
        </form>
    );
}
