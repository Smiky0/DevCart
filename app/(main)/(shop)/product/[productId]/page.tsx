import AddToCartButton from "@/components/products/buttons/AddToCartButton";
import ImageCarousel from "@/components/products/ImageCarousel";
import { FadeIn, ScaleIn } from "@/components/motion/MotionWrappers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

export default async function ProductPage({
    params,
}: {
    params: Promise<{ productId: string }>;
}) {
    // get the productId first through props
    const productId = (await params).productId;

    // get the userId if logged in
    const session = await auth();
    const userId = session?.user?.id;

    // then fetch the product data
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });
    if (!product) {
        return notFound();
    }
    return (
        <div className="py-6">
            {/* Navigation */}
            <FadeIn>
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 group"
                    >
                        <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        Back to Marketplace
                    </Link>
                </div>
            </FadeIn>

            {/* Main Content */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
                {/* IMAGE */}
                <ScaleIn delay={0.1}>
                    <ImageCarousel
                        images={product.images}
                        alt={product.title}
                    />
                </ScaleIn>

                {/* DETAILS */}
                <div className="mt-10 lg:mt-0">
                    <FadeIn delay={0.15} direction="right">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                                {product.category}
                            </span>
                        </div>

                        <h1 className="text-3xl font-semibold text-foreground/80 leading-tight tracking-tight">
                            {product.title}
                        </h1>
                    </FadeIn>

                    <FadeIn delay={0.25} direction="right">
                        <div className="mt-6 rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-sans font-medium tracking-tight text-foreground">
                                    ${product.price.toFixed(2)}
                                </span>
                                <span className="text-sm text-muted">
                                    one-time payment
                                </span>
                            </div>
                            <div className="mt-4">
                                <AddToCartButton
                                    userId={userId}
                                    productId={productId}
                                />
                            </div>
                            <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                    Instant Download
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                    Lifetime Access
                                </span>
                            </div>
                        </div>
                    </FadeIn>

                    <FadeIn delay={0.35} direction="right">
                        <div className="mt-8">
                            <h2 className="text-lg font-semibold text-foreground/70 mb-2">
                                Description
                            </h2>
                            <div className="prose prose-slate text-muted leading-relaxed">
                                <p>
                                    {product.description ||
                                        "No description available for this product."}
                                </p>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </div>
        </div>
    );
}
