"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
    CaretDownIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
} from "@phosphor-icons/react";

const sortOptions = [
    { value: "", label: "Newest" },
    { value: "title-asc", label: "Title: A → Z" },
    { value: "title-desc", label: "Title: Z → A" },
    { value: "price-asc", label: "Price: Low → High" },
    { value: "price-desc", label: "Price: High → Low" },
    { value: "sold-desc", label: "Most Sold" },
    { value: "sold-asc", label: "Least Sold" },
];

export default function ShopFilters({ categories }: { categories: string[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("q") ?? "");
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    const [, startTransition] = useTransition();

    const activeCategory = searchParams.get("category") ?? "";
    const activeSort = searchParams.get("sort") ?? "";

    const createNextUrl = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            const currentValue = params.get(key) ?? "";

            if (currentValue === value) return null;

            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }

            const query = params.toString();
            return query ? `${pathname}?${query}` : pathname;
        },
        [pathname, searchParams],
    );

    const updateParams = useCallback(
        (key: string, value: string) => {
            const nextUrl = createNextUrl(key, value);
            if (!nextUrl) return;

            startTransition(() => {
                router.push(nextUrl, { scroll: false });
            });
        },
        [createNextUrl, router],
    );

    // Keep search input in sync with URL for back/forward navigation
    useEffect(() => {
        setSearch(searchParams.get("q") ?? "");
    }, [searchParams]);

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
        <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="flex items-center rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm transition-all duration-200 hover:border-primary/35 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                <MagnifyingGlassIcon
                    size={18}
                    className="shrink-0 text-muted"
                />
                <input
                    className="w-full bg-transparent px-2 text-sm sm:text-base font-medium text-foreground placeholder:text-muted outline-none"
                    type="text"
                    placeholder="Search products, categories, and assets"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Category tabs */}
                <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
                    <button
                        type="button"
                        onClick={() => updateParams("category", "")}
                        className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
                            activeCategory ?
                                "bg-surface text-muted hover:bg-surface-container-low"
                            :   "bg-primary/10 text-primary"
                        }`}
                    >
                        All Assets
                    </button>
                    {categories.map((category) => {
                        const isActive = category === activeCategory;
                        return (
                            <button
                                key={category}
                                type="button"
                                onClick={() =>
                                    updateParams("category", category)
                                }
                                className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
                                    isActive ?
                                        "bg-primary/10 text-primary"
                                    :   "bg-surface text-muted hover:bg-surface-container-low"
                                }`}
                            >
                                {category}
                            </button>
                        );
                    })}
                </div>

                {/* Sort control */}
                <div className="relative w-full sm:w-auto sm:min-w-60">
                    <FunnelIcon
                        size={14}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <CaretDownIcon
                        size={14}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <select
                        value={activeSort}
                        onChange={(e) => updateParams("sort", e.target.value)}
                        className="h-11 w-full cursor-pointer appearance-none rounded-full border border-border bg-surface-container-low pl-10 pr-10 text-sm font-semibold text-foreground outline-none transition-all duration-200 hover:border-primary/35 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    >
                        {sortOptions.map((option) => (
                            <option
                                key={option.value || "newest"}
                                value={option.value}
                            >
                                Sort by: {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
