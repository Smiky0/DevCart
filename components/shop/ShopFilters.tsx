"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export default function ShopFilters({ categories }: { categories: string[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("q") ?? "");
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    const updateParams = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
            router.push(`/?${params.toString()}`);
        },
        [router, searchParams],
    );

    // debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            updateParams("q", search);
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // only re-run when search text changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center mb-8">
            {/* Search */}
            <div className="flex items-center flex-1 min-w-50 rounded-2xl border border-border bg-surface hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 px-4 py-2.5">
                <MagnifyingGlassIcon
                    size={16}
                    className="text-muted shrink-0"
                />
                <input
                    className="w-full px-2 text-sm text-primary font-medium placeholder:text-muted bg-transparent border-none outline-none"
                    type="text"
                    placeholder="Search by title or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Category dropdown */}
            <select
                defaultValue={searchParams.get("category") ?? ""}
                onChange={(e) => updateParams("category", e.target.value)}
                className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground cursor-pointer hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all duration-200"
            >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                    <option key={cat} value={cat}>
                        {cat}
                    </option>
                ))}
            </select>

            {/* Sort dropdown */}
            <select
                defaultValue={searchParams.get("sort") ?? ""}
                onChange={(e) => updateParams("sort", e.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground cursor-pointer hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all duration-200"
            >
                <option value="">Sort by</option>
                <option value="title-asc">Title: A → Z</option>
                <option value="title-desc">Title: Z → A</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="sold-desc">Most Sold</option>
                <option value="sold-asc">Least Sold</option>
            </select>
        </div>
    );
}
