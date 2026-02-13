import DeleteProductButton from "./buttons/DeleteProductButton";
import Image from "next/image";
import Link from "next/link";

interface ProductCardDashboardProps {
    id: string;
    productImage?: string;
    productTitle: string;
    category: string;
    price: number;
    soldItems: number;
}

function ProductCardDashboard({
    id,
    productImage,
    productTitle,
    category,
    price,
    soldItems,
}: ProductCardDashboardProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center px-6 py-4 hover:bg-primary/5 transition-colors duration-150">
            {/* Product info */}
            <Link
                href={`/product/${id}`}
                className="sm:col-span-4 flex items-center gap-3"
            >
                {productImage ?
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-alt shrink-0">
                        <Image
                            src={productImage}
                            alt={productTitle}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-full h-full object-cover"
                        />
                    </div>
                :   <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary text-sm font-bold">
                            {productTitle.charAt(0).toUpperCase()}
                        </span>
                    </div>
                }
                <span className="font-medium text-foreground text-sm truncate hover:text-primary transition-colors">
                    {productTitle}
                </span>
            </Link>

            {/* Category */}
            <div className="sm:col-span-3">
                <span className="inline-block rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                    {category}
                </span>
            </div>

            {/* Price */}
            <div className="sm:col-span-2 text-right">
                <span className="text-sm font-semibold text-foreground">
                    ${price.toFixed(2)}
                </span>
            </div>

            {/* Sold count */}
            <div className="sm:col-span-2 text-right">
                <span className="text-sm text-muted">{soldItems} sold</span>
            </div>

            {/* Delete */}
            <div className="sm:col-span-1 flex justify-end">
                <DeleteProductButton productId={id} />
            </div>
        </div>
    );
}

export default ProductCardDashboard;
