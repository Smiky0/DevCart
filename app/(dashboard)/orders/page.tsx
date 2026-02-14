import ProductCard from "@/components/products/ProductCard";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function page() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        redirect("/api/auth/signin");
    }
    const orders = await prisma.purchase.findMany({
        where: {
            buyerId: userId,
        },
        include: {
            items: {
                include: {
                    product: {
                        include: {
                            fileAsset: true,
                        },
                    },
                },
            },
        },
    });
    return (
        <div className="py-6 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-foreground mb-6">
                Purchases
            </h1>
            {orders.length === 0 ?
                <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-3xl">📦</span>
                    </div>
                    <p className="text-lg text-muted">No orders yet</p>
                </div>
            :   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order) =>
                        order.items.map((item) => (
                            <ProductCard
                                key={item.id}
                                id={item.product.id}
                                title={item.product.title}
                                category={item.product.category}
                                price={item.price}
                                imageUrl={item.product.images[0]}
                                addItem={false}
                                isPurchased={true}
                                fileAssetId={item.product.fileAsset?.id}
                                fileAssetName={item.product.fileAsset?.fileName}
                            />
                        )),
                    )}
                </div>
            }
        </div>
    );
}
