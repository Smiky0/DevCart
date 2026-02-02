import AddToCartButton from "@/components/products/buttons/AddToCartButton";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
        <div className="min-h-screen bg-white rounded-2xl">
            {/* ... Navigation ... */}
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Marketplace
                </Link>
            </div>

            {/* ... Main Content ... */}
            <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
                    {/* IMAGE */}
                    <div className="product-image-container">
                        <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-gray-100">
                            <img
                                src={product.images[0]}
                                alt={product.title}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>

                    {/* DETAILS */}
                    <div className="mt-10 px-2 sm:mt-16 sm:px-0 lg:mt-0">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            {product.title}
                        </h1>

                        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
                            <p className="text-3xl font-bold text-gray-900">
                                ${(product.price / 100).toFixed(2)}
                            </p>
                            {/* <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-8 py-4 font-bold text-white cursor-pointer hover:bg-gray-800"> */}
                            <AddToCartButton
                                userId={userId}
                                productId={productId}
                            />
                            {/* </button> */}
                        </div>

                        <div className="mt-10 prose prose-gray text-gray-600">
                            <p>{product.description || "No description."}</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
