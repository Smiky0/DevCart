"use server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/cloudflareR2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";

/**
 * Delete objects from R2 buckets. Failures are logged but don't block the operation.
 * Skips silently when the bucket is not configured.
 */
async function deleteR2Objects(keys: string[], bucket?: string) {
    if (!bucket || keys.length === 0) return;
    await Promise.allSettled(
        keys.map((key) =>
            r2
                .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
                .catch((err) => console.error(`Failed to delete R2 object ${key}:`, err)),
        ),
    );
}

// delete product from user dashboard
export async function deleteProduct(productId: string) {
    const session = await auth();
    const user = session?.user?.id;
    // if not logged in
    if (!user) {
        return { success: false, message: "Not authenticated." };
    }

    // verify if product belongs to user and if product id is valid
    let ownedProduct: {
        images: string[];
        fileAsset: { storageKey: string } | null;
    } | null = null;
    try {
        // check if product exist (include fileAsset so we can clean up R2)
        const product = await prisma.product.findUnique({
            where: {
                id: productId,
            },
            include: { fileAsset: true },
        });
        // if doesnt return
        if (!product) {
            return { success: false, message: "Product doesn't exist." };
        }
        // check if product belongs to user
        if (product.sellerId != user) {
            return { success: false, message: "You don't own the product." };
        }
        // remember what needs cleaning up in R2 after the DB commit
        ownedProduct = product;
    } catch (err) {
        console.error("Failed to load product for deletion:", err);
        return {
            success: false,
            message: "Unable to find product.",
        };
    }

    // delete the product from all tables where product details are listed.
    // The DB transaction runs FIRST: a failed delete must never leave the
    // buyer-visible product gone while its files were already destroyed.
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
    } catch (err) {
        console.error(`Failed to delete product ${productId}:`, err);
        return {
            success: false,
            message: "Unable to delete product. Please try again.",
        };
    }

    // --- Clean up R2 files (best effort, after the DB commit) ---
    // If this fails, orphaned storage objects remain — harmless and easy to
    // garbage-collect later. The reverse order would permanently destroy
    // files for a product that is still on sale.
    try {
        if (ownedProduct.images.length > 0) {
            await deleteR2Objects(ownedProduct.images, process.env.R2_PUBLIC_BUCKET);
        }
        if (ownedProduct.fileAsset) {
            await deleteR2Objects(
                [ownedProduct.fileAsset.storageKey],
                process.env.R2_PRIVATE_BUCKET,
            );
        }
    } catch (err) {
        console.error(
            `R2 cleanup failed for product ${productId}; orphaned objects may remain:`,
            err,
        );
    }

    revalidatePath("/studio");
    return {
        success: true,
        message: "Product ID: " + productId + ", is successfully deleted.",
    };
}

// add product from user dashboard
export async function addProduct(formData: FormData) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return { success: false, message: "Not authenticated." };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priceStr = formData.get("price") as string;
    const category = formData.get("category") as string;
    const imagesJson = formData.get("images") as string | null;

    // File asset fields (optional)
    const fileName = formData.get("fileName") as string | null;
    const fileSizeStr = formData.get("fileSize") as string | null;
    const storageKey = formData.get("storageKey") as string | null;

    // Parse images array
    let images: string[] = [];
    try {
        images = imagesJson ? JSON.parse(imagesJson) : [];
    } catch {
        return { success: false, message: "Invalid image data." };
    }

    // Validation
    if (!title || !description || !priceStr || !category || images.length === 0) {
        return {
            success: false,
            message: "All fields are required (including at least one image).",
        };
    }

    const priceDollars = parseFloat(priceStr);
    if (isNaN(priceDollars) || priceDollars <= 0) {
        return { success: false, message: "Price must be a positive number." };
    }
    // prices are stored as integer cents to avoid floating point money bugs
    const priceCents = Math.round(priceDollars * 100);

    try {
        const product = await prisma.product.create({
            data: {
                sellerId: userId,
                title,
                description,
                price: priceCents,
                category,
                images,
                isPublished: true,
                // Create the file asset if one was uploaded
                ...(fileName && storageKey && fileSizeStr
                    ? {
                          fileAsset: {
                              create: {
                                  fileName,
                                  fileSize: parseInt(fileSizeStr, 10),
                                  storageKey,
                              },
                          },
                      }
                    : {}),
            },
        });

        revalidatePath("/studio");
        revalidatePath("/");
        return {
            success: true,
            message: "Product created successfully!",
            productId: product.id,
        };
    } catch (err) {
        console.error("Failed to create product:", err);
        return {
            success: false,
            message: "Failed to create product. Please try again.",
        };
    }
}
