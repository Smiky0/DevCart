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
            <div className="min-w-xs group relative flex flex-1 flex-col w-full max-w-sm overflow-hidden rounded-2xl bg-black/40 backdrop-blur-3xl shadow-xl shadow-black/20 border-2 border-white/60 transition-all hover:shadow-xl">
                {/* Image Section */}
                <div className="relative aspect-4/3 overflow-hidden border-b-2 border-white/40 rounded-2xl">
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
                        <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-800">
                            {category}
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-1 flex-col p-5">
                    <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between">
                            <h3
                                className="text-xl font-bold text-white line-clamp-1"
                                title={title}
                            >
                                {title}
                            </h3>
                        </div>

                        <p className="text-sm text-shadow-white mb-4">
                            Instant download • Lifetime access
                        </p>
                    </div>

                    {/* Footer: Price & Action */}
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-shadow-white">
                                Price
                            </span>
                            <span className="text-xl font-bold text-white">
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
