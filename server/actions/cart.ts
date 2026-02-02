"use server";
import prisma from "@/lib/prisma";
import { error } from "console";
import { revalidatePath } from "next/cache";

// get current user cart
export async function getCart(userId: string) {
    return await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: { product: true },
            },
        },
    });
}

// add item to cart
export async function addToCart(userId: string, productId: string) {
    // find cart for this user
    const cart = await prisma.cart.findUnique({
        where: { userId },
    });
    // if user has no cart yet
    if (!cart) {
        // create a new cart for the user
        await prisma.cart.create({
            data: { userId },
        });
    }

    // add the item to cart
    try {
        // check if item already exist in your cart
        const productExist = await prisma.cartItem.findFirst({
            where: {
                productId: productId,
                cartId: cart!.id,
            },
        });
        if (productExist) {
            return {
				success: true,
				status:"exist",
                message: "Item already exists in your cart!",
            };
        }

        // if this item isnt added before; simply add now
        await prisma.cartItem.create({
            data: {
                cartId: cart!.id,
                productId: productId,
            },
        });
    } catch {
        // likely when item already exist in db.
        return { success: false, message: "Unable to add item to your cart!" };
    }

    // when new item is added. (return statement of try block)
    revalidatePath("/cart", "page");
    return { success: true, status:"added", message: "Item added." };
}

// remove item from cart
export async function removeFromCart(userId: string, itemId: string) {
    try {
        // make sure the cart belongs to the user
        const cart = await prisma.cart.findUnique({ where: { userId } });

        // if cart belongs to the user
        if (cart) {
            const deleteItem = await prisma.cartItem.deleteMany({
                where: {
                    id: itemId,
                    cartId: cart.id,
                },
			});
			// if item was deleted
			if (deleteItem.count) {
				return { success: true, message: "Item removed from cart!" };
			}
		}
		// if cart doesnt belong to user; throw error.
        throw error;
    } catch {
        return { success: false, message: "Couldnt remove item" };
    } finally {
        revalidatePath("/cart", "page");
    }
}
