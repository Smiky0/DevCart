import { BuyButton } from "@/components/products/buttons/BuyButton";
import ProductCard from "@/components/products/ProductCard";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ItemsPage() {
    // get the userid from userauth
    const session = await auth();
    if (!session) {
        return redirect("/api/auth/signin");
    }
    const userId = session.user?.id;

    // get the cartitems using userID
    const cartItems = await prisma.cartItem.findMany({
        where: {
            cart: { userId: userId },
        },
        include: {
            product: true,
        },
    });
    // find total price of cart items.
    const totalPrice = cartItems.reduce((acc, item) => {
        return acc + item.product.price;
    }, 0);
    return (
        <div className="flex flex-col justify-center items-center gap-4">
            <div className="flex flex-col md:flex-row gap-2 items-center justify-between w-full font-medium font-mono text-black bg-white border-2 border-black rounded-2xl px-4 py-2">
                <span>Quantity: {cartItems.length}</span>
                <span>Total Price: ${totalPrice.toFixed(2)}</span>
				<BuyButton price={totalPrice} />
            </div>
            <div className="w-full flex flex-wrap justify-center items-center gap-6">
                {cartItems.map((item) => (
                    <ProductCard
                        key={item.id}
                        id={item.product.id}
                        title={item.product.title}
                        category={item.product.category}
                        price={item.product.price}
                        imageUrl={item.product.images[0]}
                        cartItemId={item.id}
                        addItem={false}
                    />
                ))}
            </div>
        </div>
    );
}
