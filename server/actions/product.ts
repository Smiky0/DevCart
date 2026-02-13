"use server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// delete product from user dashboard
export async function deleteProduct(productId: string) {
    const session = await auth();
    const user = session?.user?.id;
    // if not logged in
    if (!user) {
        return { success: false, message: "Not authenticated." };
    }

    // verify if product belongs to user and if product id is valid
    try {
        // check if product exist
        const product = await prisma.product.findUnique({
            where: {
                id: productId,
            },
        });
        // if doesnt return
        if (!product) {
            return { success: false, message: "Product doesn't exist." };
        }
        // check if product belongs to user
        if (product.sellerId != user) {
            return { success: false, message: "You don't own the product." };
        }
    } catch (err) {
        return {
            success: false,
            message: "Unable to find product: Error:" + err,
        };
    }

    // if does then delete the product from all tables where product details are listed
    //delete product from product, fileAsset, cartItem table
    try {
        const deleteProduct = prisma.product.delete({
            where: { id: productId },
        });
        const deletePurchasedItem = prisma.purchaseItem.deleteMany({
            where: { productId: productId },
        });
        const deleteProductAssets = prisma.fileAsset.deleteMany({
            where: { productId: productId },
        });
        const deleteFromCart = prisma.cartItem.deleteMany({
            where: { productId: productId },
        });
        // product gets deleted from all table, or doesnt.
        await prisma.$transaction([
            deletePurchasedItem,
            deleteFromCart,
            deleteProductAssets,
            deleteProduct,
        ]);
        revalidatePath("/studio");
        return {
            success: true,
            message: "Product ID: " + productId + ", is successfully deleted.",
        };
    } catch (err) {
        return {
            success: false,
            message:
                "Unable to delete product ID: " + productId + ". Error: " + err,
        };
    }
}

// add product from user dashboard
export async function addProduct() {
	
}
