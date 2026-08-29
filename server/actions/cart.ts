"use server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// resolve the current user's id from their session; never trust a client
// supplied userId.
async function getSessionUserId(): Promise<string | null> {
    const session = await auth();
    return session?.user?.id ?? null;
}

// get current user cart
export async function getCart() {
    const userId = await getSessionUserId();
    if (!userId) {
        return null;
    }
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
export async function addToCart(productId: string) {
    const userId = await getSessionUserId();
    if (!userId) {
        return { success: false, message: "Not authenticated." };
    }

    // find cart for this user
    let cart = await prisma.cart.findUnique({
        where: { userId },
    });
    // if user has no cart yet
    if (!cart) {
        // create a new cart for the user
        cart = await prisma.cart.create({
            data: { userId },
        });
    }

    // add the item to cart
    try {
        // check if item already exist in your cart
        const productExist = await prisma.cartItem.findFirst({
            where: {
                productId: productId,
                cartId: cart.id,
            },
        });
        if (productExist) {
            return {
                success: true,
                status: "exist",
                message: "Item already exists in your cart!",
            };
        }

        // if this item isnt added before; simply add now
        await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                productId: productId,
            },
        });
    } catch {
        // likely when item already exist in db.
        return { success: false, message: "Unable to add item to your cart!" };
    }

    // when new item is added. (return statement of try block)
    revalidatePath("/cart", "page");
    return { success: true, status: "added", message: "Item added." };
}

// remove item from cart
export async function removeFromCart(itemId: string) {
    const userId = await getSessionUserId();
    if (!userId) {
        return { success: false, message: "Not authenticated." };
    }

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
        throw new Error("Cart not found for user");
    } catch {
        return { success: false, message: "Couldnt remove item" };
    } finally {
        revalidatePath("/cart", "page");
    }
}
