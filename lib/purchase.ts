"use server";

import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import prisma from "./prisma";

export async function processOrder() {
    const session = await auth();
    if (!session || !session.user?.id) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // fetch product from db
    const userCart = await prisma.cart.findUnique({
        where: {
            userId: userId,
        },
        include: {
            items: {
                include: { product: true },
            },
        },
    });
    // check if cart is valid or has items
    if (!userCart || userCart.items.length === 0) {
        throw new Error("Order cart is empty!");
    }

    // get the total cart amount
    const totalAmount = userCart.items.reduce((sum, items) => {
        return sum + items.product.price;
    }, 0);

    try {
        const transaction = await prisma.$transaction(async (tx) => {
            // add item to purchase
            const purchase = await tx.purchase.create({
                data: {
                    buyerId: userId,
                    totalAmount: totalAmount,
                    items: {
                        create: userCart.items.map((item) => ({
                            productId: item.productId,
                            sellerId: item.product.sellerId,
                            price: item.product.price,
                        })),
                    },
                },
            });
            // delete item from cart
            await tx.cartItem.deleteMany({
                where: { cartId: userCart.id },
            });
            return purchase;
        });
        revalidatePath("/cart");
        return { sucess: true, purchaseId: transaction.id };
    } catch (err) {
        console.error("Transaction failed", err);
        throw new Error("Transaction failed");
    }
}
