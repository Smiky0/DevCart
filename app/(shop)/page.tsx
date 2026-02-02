"use server";
import prisma from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";

export default async function MainPage() {
    const products = await prisma.product.findMany();
    return (
        <div className="w-full flex flex-wrap justify-center items-center gap-6">
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    category={product.category}
                    price={product.price}
                    imageUrl={product.images[0]}
                    addItem={true}
                />
            ))}
        </div>
    );
}