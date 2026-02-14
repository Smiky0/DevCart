"use server";
import Link from "next/link";
import Image from "next/image";
import AddToCartButton from "./buttons/AddToCartButton";
import RemoveFromCart from "./buttons/RemoveFromCartButton";
import DownloadAssetButton from "./buttons/DownloadAssetButton";
import { auth } from "@/lib/auth";

interface ProductCardProps {
    id: string;
    title: string;
    category: string;
    price: number;
    imageUrl: string;
    cartItemId?: string;
    addItem: boolean;
    isPurchased?: boolean;
    fileAssetId?: string;
    fileAssetName?: string;
}

export default async function ProductCard({
    id,
    title,
    category,
    price,
    imageUrl,
    cartItemId,
    addItem,
    isPurchased,
    fileAssetId,
    fileAssetName,
}: ProductCardProps) {
    // if logged in pass the userID
    // else will be asked when add to cart is called
    const session = await auth();
    const userId = session?.user?.id;

    return (
        <Link href={`/product/${id}`}>
            <div className="group relative flex flex-col w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-lg shadow-foreground/20 transition-all duration-300 hover:shadow-xl hover:shadow-foreground/30 hover:-translate-y-1">
                {/* Image Section with gradient overlay */}
                <div className="relative aspect-4/3 overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt={title}
                        width={600}
                        height={400}
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Top-left category label */}
                    <div className="absolute flex justify-center items-center top-4 left-5 rounded-full backdrop-blur-sm border-border bg-primary/40 px-3 py-1">
                        <span className="text-xs font-medium tracking-wide text-surface/95">
                            {category}
                        </span>
                    </div>

                    {/* Bottom gradient fade into dark content area */}
                    <div className="absolute inset-x-0 bottom-0 h-1/4 backdrop-blur-sm backdrop-opacity-40 bg-linear-to-t from-surface via-surface/40 to-transparent" />
                </div>

                {/* Content Section — dark bottom panel */}
                <div className="flex flex-1 flex-col px-5 pt-1 pb-5 bg-surface">
                    <div className="flex-1 mb-3">
                        <h3
                            className="text-xl font-semibold text-foreground leading-tight line-clamp-2 tracking-tight"
                            title={title}
                        >
                            {title}
                        </h3>
                        <p className="text-xs text-foreground/70 mt-1.5 font-light">
                            Instant download &middot; Lifetime access
                        </p>
                    </div>

                    {/* Footer: Price & Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-foreground/10">
                        <span className="text-lg font-semibold text-foreground tracking-tight">
                            ${price.toFixed(2)}
                        </span>
                        {fileAssetId || isPurchased ?
                            <DownloadAssetButton
                                assetId={fileAssetId}
                                fileName={fileAssetName}
                            />
                        : !addItem && cartItemId ?
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
