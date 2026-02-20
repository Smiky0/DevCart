"use server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { r2 } from "@/lib/cloudflareR2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";

/**
 * Delete objects from R2 buckets. Failures are logged but don't block the operation.
 */
async function deleteR2Objects(keys: string[], bucket: string) {
    await Promise.allSettled(
        keys.map((key) =>
            r2
                .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
                .catch((err) =>
                    console.error(`Failed to delete R2 object ${key}:`, err),
                ),
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

        // --- Clean up R2 files ---
        // Delete public images
        if (product.images.length > 0) {
            await deleteR2Objects(
                product.images,
                process.env.R2_PUBLIC_BUCKET!,
            );
        }
        // Delete private file asset
        if (product.fileAsset) {
            await deleteR2Objects(
                [product.fileAsset.storageKey],
                process.env.R2_PRIVATE_BUCKET!,
            );
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
    if (
        !title ||
        !description ||
        !priceStr ||
        !category ||
        images.length === 0
    ) {
        return {
            success: false,
            message: "All fields are required (including at least one image).",
        };
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
        return { success: false, message: "Price must be a positive number." };
    }

    try {
        const product = await prisma.product.create({
            data: {
                sellerId: userId,
                title,
                description,
                price,
                category,
                images,
                isPublished: true,
                // Create the file asset if one was uploaded
                ...(fileName && storageKey && fileSizeStr ?
                    {
                        fileAsset: {
                            create: {
                                fileName,
                                fileSize: parseInt(fileSizeStr, 10),
                                storageKey,
                            },
                        },
                    }
                :   {}),
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
        return {
            success: false,
            message: "Failed to create product. Error: " + err,
        };
    }
}
