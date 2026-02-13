import { BuyButton } from "@/components/products/buttons/BuyButton";
import ProductCard from "@/components/products/ProductCard";
import {
    AnimatedCard,
    FadeIn,
    PopIn,
} from "@/components/motion/MotionWrappers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ItemsPage() {
    // get the userid from userauth
    const session = await auth();
    if (!session) {
        return redirect("/api/auth/signin");
    }
    const userId = session.user?.id;

    // get the cartitems using userID
    const cartItems = await prisma.cartItem.findMany({
        where: {
            cart: { userId: userId },
        },
        include: {
            product: true,
        },
    });
    // find total price of cart items.
    const totalPrice = cartItems.reduce((acc, item) => {
        return acc + item.product.price;
    }, 0);
    return (
        <div className="py-6">
            <FadeIn>
                <h1 className="text-3xl font-bold text-foreground mb-6">
                    Your Cart
                </h1>
            </FadeIn>
            {cartItems.length ?
                <FadeIn delay={0.1}>
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between w-full bg-white border border-border/60 rounded-2xl px-6 py-4 shadow-sm mb-8">
                        <div className="flex items-center gap-6 text-sm font-medium text-foreground">
                            <span className="flex items-center gap-2">
                                <PopIn delay={0.2}>
                                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                        {cartItems.length}
                                    </span>
                                </PopIn>
                                items
                            </span>
                            <PopIn delay={0.25}>
                                <span className="text-2xl font-bold text-foreground">
                                    ${totalPrice.toFixed(2)}
                                </span>
                            </PopIn>
                        </div>
                        <BuyButton price={totalPrice} />
                    </div>
                </FadeIn>
            :   <FadeIn delay={0.1}>
                    <div className="text-center py-16">
                        <PopIn delay={0.15}>
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-3xl">🛒</span>
                            </div>
                        </PopIn>
                        <p className="text-lg text-muted mb-2">
                            Your cart is empty
                        </p>
                        <Link
                            href={"/"}
                            className="text-primary font-medium hover:text-primary-dark transition-colors"
                        >
                            Browse products →
                        </Link>
                    </div>
                </FadeIn>
            }

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cartItems.map((item, index) => (
                    <AnimatedCard key={item.id} index={index}>
                        <ProductCard
                            id={item.product.id}
                            title={item.product.title}
                            category={item.product.category}
                            price={item.product.price}
                            imageUrl={item.product.images[0]}
                            cartItemId={item.id}
                            addItem={false}
                        />
                    </AnimatedCard>
                ))}
            </div>
        </div>
    );
}
