"use client";

import ProductCard from "@/components/products/ProductCard";
import { getImageUrl } from "@/lib/utils";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr";
import { useRef, useState } from "react";

interface ShopProduct {
    id: string;
    title: string;
    category: string;
    price: number;
    images: string[];
}

interface LoadMoreProductsProps {
    initialCursor: string | null;
    category?: string;
    q?: string;
    userId?: string | null;
}

/**
 * Client-side continuation of the keyset-paginated product grid.
 * Fetches the next page from the /api/products BFF route using the
 * signed cursor and appends the cards to the server-rendered grid.
 */
export default function LoadMoreProducts({
    initialCursor,
    category,
    q,
    userId,
}: LoadMoreProductsProps) {
    const [items, setItems] = useState<ShopProduct[]>([]);
    const [cursor, setCursor] = useState(initialCursor);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);

    async function loadMore() {
        if (!cursor || loading) return;
        setLoading(true);
        setError(false);
        try {
            const params = new URLSearchParams({ cursor });
            if (category) params.set("category", category);
            if (q) params.set("q", q);

            const res = await fetch(`/api/products?${params.toString()}`);
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const page: { items: ShopProduct[]; nextCursor: string | null } =
                await res.json();

            setItems((prev) => [...prev, ...page.items]);
            setCursor(page.nextCursor);
            // keep the footer visible below freshly appended content
            requestAnimationFrame(() =>
                sentinel.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "end",
                }),
            );
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((product) => (
                    <ProductCard
                        key={product.id}
                        id={product.id}
                        title={product.title}
                        category={product.category}
                        price={product.price}
                        imageUrl={getImageUrl(product.images[0])}
                        addItem={true}
                        userId={userId}
                    />
                ))}
            </div>

            {cursor && (
                <div ref={sentinel} className="mt-8 flex justify-center">
                    {loading ? (
                        <span className="text-sm text-muted">Loading...</span>
                    ) : error ? (
                        <div className="text-center">
                            <p className="text-sm text-muted">Something went wrong.</p>
                            <button
                                onClick={loadMore}
                                className="mt-2 text-sm font-medium text-primary underline underline-offset-4 hover:text-foreground"
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={loadMore}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background hover:shadow-md"
                        >
                            <ArrowDownIcon weight="bold" />
                            Load more products
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
