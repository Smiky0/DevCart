import prisma from "@/lib/prisma";
import { getImageUrl } from "@/lib/utils";
import ProductCard from "@/components/products/ProductCard";
import ShopFilters from "@/components/shop/ShopFilters";
import LandingHero from "@/components/shop/LandingHero";
import { AnimatedCard, FadeIn } from "@/components/motion/MotionWrappers";
import Footer from "@/components/navigation/footer";

// Maps sort option strings to Prisma orderBy objects
const sortOptions: Record<string, object> = {
    "title-asc": { title: "asc" },
    "title-desc": { title: "desc" },
    "price-asc": { price: "asc" },
    "price-desc": { price: "desc" },
    "sold-desc": { purchaseItems: { _count: "desc" } },
    "sold-asc": { purchaseItems: { _count: "asc" } },
};

export default async function MainPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
    const { q, category, sort } = await searchParams;

    // Get all categories for the filter dropdown
    const allCategories = await prisma.product.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
        cacheStrategy: { ttl: 600, swr: 60 },
    });
    const categories = allCategories.map((c) => c.category);

    // Fetch products with optional search, category filter, and sorting
    const products = await prisma.product.findMany({
        where: {
            // If a search query exists, match title or category
            ...(q && {
                OR: [
                    { title: { contains: q, mode: "insensitive" as const } },
                    { category: { contains: q, mode: "insensitive" as const } },
                ],
            }),
            // If a category is selected, filter by it
            ...(category && { category }),
        },
        // If a sort option is selected, apply it; otherwise show newest first
        orderBy: sort ? sortOptions[sort] : { id: "desc" },
        cacheStrategy: { ttl: 120 },
    });

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
                {products.length > 0 ?
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product, index) => (
                            <AnimatedCard key={product.id} index={index}>
                                <ProductCard
                                    id={product.id}
                                    title={product.title}
                                    category={product.category}
                                    price={product.price}
                                    imageUrl={getImageUrl(product.images[0])}
                                    addItem={true}
                                />
                            </AnimatedCard>
                        ))}
                    </div>
                :   <FadeIn delay={0.15}>
                        <div className="text-center py-16">
                            <p className="text-lg text-muted">
                                No products found
                            </p>
                            <p className="text-sm text-muted mt-1">
                                Change your search or filters.
                            </p>
                        </div>
                    </FadeIn>
                }
                <Footer />
            </div>
        </>
    );
}
