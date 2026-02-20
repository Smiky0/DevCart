import ProductCardDashboard from "@/components/products/ProductCardDashboard";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ListedProducts() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return redirect("/api/auth/signin");

    // Get ALL products by this seller
    const allProducts = await prisma.product.findMany({
        where: { sellerId: userId },
        orderBy: { title: "asc" },
    });

    // Get all items sold by this user
    const soldItems = await prisma.purchaseItem.findMany({
        where: { sellerId: userId },
    });

    // Calculate stats
    const totalItemsSold = soldItems.length;
    const totalRevenue = soldItems.reduce((sum, item) => sum + item.price, 0);

    // Count sales per product
    const salesCountMap = new Map<string, number>();
    for (const item of soldItems) {
        salesCountMap.set(
            item.productId,
            (salesCountMap.get(item.productId) || 0) + 1,
        );
    }

    // Build display list: every product with its sold count (0 if none)
    const productRows = allProducts.map((product) => ({
        product,
        count: salesCountMap.get(product.id) || 0,
    }));
    const uniqueProductsSold = [...salesCountMap.keys()].length;

    return (
        <div className="py-6 m-2 md:m-4 animate-fade-in-up flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-muted mt-1">
                        Welcome back, {session?.user?.name || "User"}
                    </p>
                </div>
                <Link
                    href="/studio/products/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-dark px-5 py-2.5 text-sm font-semibold text-surface transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <PlusIcon size={18} weight="bold" />
                    New Product
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface border font-semibold border-border/60 rounded-2xl p-6 shadow-sm">
                    <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-1">
                        Items Sold
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        {totalItemsSold}
                    </p>
                </div>
                <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm">
                    <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-1">
                        Revenue
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        ${totalRevenue.toFixed(2)}
                    </p>
                </div>
                <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm">
                    <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-1">
                        Products Sold
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        {uniqueProductsSold}
                    </p>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-surface border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border/60">
                    <h2 className="text-lg font-semibold text-foreground">
                        Your Products
                    </h2>
                </div>

                {/* Table header */}
                <div className="hidden sm:grid grid-cols-14 gap-4 px-6 py-3 bg-surface-alt text-xs font-semibold text-muted uppercase tracking-wide border-b border-border/40">
                    <span className="col-span-4">Product</span>
                    <span className="col-span-2">Category</span>
                    <span className="col-span-2 text-right">Price</span>
                    <span className="col-span-2 text-right">Sold</span>
                    <span className="col-span-3 text-right">Total Profit</span>
                    <span className="col-span-1"></span>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-border/40">
                    {productRows.length > 0 ?
                        productRows.map(({ product, count }) => (
                            <ProductCardDashboard
                                key={product.id}
                                id={product.id}
                                productImage={getImageUrl(product.images[0])}
                                productTitle={product.title}
                                category={product.category}
                                price={product.price}
                                soldItems={count}
                                totalProfit={count * product.price}
                            />
                        ))
                    :   <div className="px-6 py-12 text-center text-muted">
                            No products yet. Create one to get started!
                        </div>
                    }
                </div>
            </div>
        </div>
    );
}
