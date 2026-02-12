"use server";
import Link from "next/link";
import Image from "next/image";
import AddToCartButton from "./buttons/AddToCartButton";
import RemoveFromCart from "./buttons/RemoveFromCartButton";
import { auth } from "@/lib/auth";

interface ProductCardProps {
    id: string;
    title: string;
    category: string;
    price: number;
    imageUrl: string;
    cartItemId?: string;
    addItem: boolean;
}

export default async function ProductCard({
    id,
    title,
    category,
    price,
    imageUrl,
    cartItemId,
    addItem,
}: ProductCardProps) {
    // if logged in pass the userID
    // else will be asked when add to cart is called
    const session = await auth();
    const userId = session?.user?.id;

    return (
        <Link href={`/product/${id}`}>
            <div className="group relative flex flex-col w-full overflow-hidden rounded-2xl bg-white shadow-md shadow-orange-500/5 border border-border/60 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1">
                {/* Image Section */}
                <div className="relative aspect-4/3 overflow-hidden bg-surface-alt">
                    <Image
                        src={imageUrl}
                        alt={title}
                        width={600}
                        height={400}
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Floating Category Badge */}
                    <div className="absolute right-3 bottom-3">
                        <span className="inline-block rounded-full bg-primary/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
                            {category}
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-1 flex-col p-5">
                    <div className="flex-1">
                        <h3
                            className="text-lg font-bold text-foreground line-clamp-1 mb-1"
                            title={title}
                        >
                            {title}
                        </h3>
                        <p className="text-xs text-muted flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success"></span>
                            Instant download &bull; Lifetime access
                        </p>
                    </div>

                    {/* Footer: Price & Action */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted font-medium uppercase tracking-wide">
                                Price
                            </span>
                            <span className="text-xl font-bold text-foreground">
                                ${price.toFixed(2)}
                            </span>
                        </div>
                        {!addItem && cartItemId ?
                            <RemoveFromCart
                                userId={userId}
                                cartItemId={cartItemId}
                            />
                        :   <AddToCartButton userId={userId} productId={id} />}
                    </div>
                </div>
            </div>
        </Link>
    );
}
