import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";
import { listProducts } from "@/lib/products";
import ProductCard from "@/components/products/ProductCard";
import LoadMoreProducts from "@/components/shop/LoadMoreProducts";
import ShopFilters from "@/components/shop/ShopFilters";
import LandingHero from "@/components/shop/LandingHero";
import { AnimatedCard, FadeIn } from "@/components/motion/MotionWrappers";
import Footer from "@/components/navigation/footer";

export default async function MainPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; category?: string }>;
}) {
    const { q, category } = await searchParams;

    // Get all categories for the filter dropdown.
    // Cached server-side; ttl/swr kept short so newly created or deleted
    // products appear in the filters within ~a minute. Accelerate caches
    // are not purged by revalidatePath, so avoid long TTLs here.
    const allCategories = await prisma.product.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
        cacheStrategy: { ttl: 60, swr: 15 },
    });
    const categories = allCategories.map((c) => c.category);

    // First page of the keyset-paginated product grid.
    // Ordering is (updatedAt DESC, id DESC) to ride the composite browse
    // indexes; deeper pages are fetched client-side through /api/products
    // using the signed cursor.
    const session = await auth();
    const page = await listProducts({ category, q });

    return (
        <>
            {/* landing page */}
            <LandingHero />

            <div className="py-6" id="products-section">
                {/* Filters */}
                <FadeIn delay={0.1} className="mt-20">
                    <ShopFilters categories={categories} />
                </FadeIn>

                {/* Product grid */}
                {page.items.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {page.items.map((product, index) => (
                            <AnimatedCard key={product.id} index={index}>
                                <ProductCard
                                    id={product.id}
                                    title={product.title}
                                    category={product.category}
                                    price={product.price}
                                    imageUrl={getImageUrl(product.images[0])}
                                    addItem={true}
                                    userId={session?.user?.id}
                                />
                            </AnimatedCard>
                        ))}
                    </div>
                ) : (
                    <FadeIn delay={0.15}>
                        <div className="text-center py-16">
                            <p className="text-lg text-muted">No products found</p>
                            <p className="text-sm text-muted mt-1">
                                Change your search or filters.
                            </p>
                        </div>
                    </FadeIn>
                )}

                {/* Client-side continuation via signed cursors */}
                {page.items.length > 0 && (
                    <LoadMoreProducts
                        initialCursor={page.nextCursor}
                        category={category}
                        q={q}
                        userId={session?.user?.id}
                    />
                )}
                <Footer />
            </div>
        </>
    );
}
