"use client";
import Link from "next/link";
import Image from "next/image";
import AddToCartButton from "./buttons/AddToCartButton";
import RemoveFromCart from "./buttons/RemoveFromCartButton";
import DownloadAssetButton from "./buttons/DownloadAssetButton";
import { formatPrice } from "@/lib/utils";

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
    // used only to decide the sign-in redirect target; the cart
    // actions derive the real identity from the session server-side.
    userId?: string | null;
}

export default function ProductCard({
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
    userId,
}: ProductCardProps) {
    return (
        <Link href={`/product/${id}`}>
            <div className="group relative flex flex-col w-full overflow-hidden rounded-2xl bg-surface shadow-md shadow-foreground/8 transition-all duration-200 hover:shadow-xl hover:shadow-foreground/15 hover:-translate-y-1">
                {/* Image Section — dashed border container */}
                <div className="mx-5 mb-4 mt-6">
                    <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center">
                        <Image
                            src={imageUrl}
                            alt={title}
                            width={400}
                            height={400}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-1 flex-col px-5 pb-2">
                    <span className="text-sm font-normal text-foreground/60 tracking-wide">
                        {category}
                    </span>
                    <h3
                        className="mt-1 text-lg font-semibold text-foreground/70 leading-6 line-clamp-1 tracking-tight"
                        title={title}
                    >
                        {title}
                    </h3>
                    <span className="mt-2 text-2xl font-sans font-medium text-foreground">
                        ${formatPrice(price)}
                    </span>
                </div>

                {/* Footer: Action button */}
                <div className="mx-5 mb-5 mt-3 border-t-2 border-dashed border-border/60 pt-4">
                    <div className="flex items-center justify-center">
                        {fileAssetId || isPurchased ? (
                            <DownloadAssetButton
                                assetId={fileAssetId}
                                fileName={fileAssetName}
                            />
                        ) : !addItem && cartItemId ? (
                            <RemoveFromCart
                                userId={userId ?? undefined}
                                cartItemId={cartItemId}
                            />
                        ) : (
                            <AddToCartButton
                                userId={userId ?? undefined}
                                productId={id}
                            />
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
