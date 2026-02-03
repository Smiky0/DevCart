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
                    product: true,
                },
            },
        },
    });
    return (
        <div className="w-full flex flex-wrap justify-center items-center gap-6">
            {orders.map((order) =>
                order.items.map((item) => (
                    <ProductCard
                        key={item.id}
                        id={item.id}
                        title={item.product.title}
                        category={item.product.category}
                        price={item.price}
                        imageUrl={item.product.images[0]}
                        addItem={true}
                    />
                )),
            )}
        </div>
    );
}
