import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    productFindUnique: vi.fn(),
    productCreate: vi.fn(),
    productDelete: vi.fn(),
    purchaseItemDeleteMany: vi.fn(),
    fileAssetDeleteMany: vi.fn(),
    cartItemDeleteMany: vi.fn(),
    transaction: vi.fn(),
    r2Send: vi.fn(),
    revalidatePath: vi.fn(),
    deleteCommands: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/prisma", () => ({
    default: {
        product: {
            findUnique: mocks.productFindUnique,
            create: mocks.productCreate,
            delete: mocks.productDelete,
        },
        purchaseItem: { deleteMany: mocks.purchaseItemDeleteMany },
        fileAsset: { deleteMany: mocks.fileAssetDeleteMany },
        cartItem: { deleteMany: mocks.cartItemDeleteMany },
        $transaction: mocks.transaction,
    },
}));

vi.mock("@/lib/cloudflareR2", () => ({ r2: { send: mocks.r2Send } }));

vi.mock("@aws-sdk/client-s3", () => ({
    DeleteObjectCommand: class {
        constructor(input: Record<string, unknown>) {
            mocks.deleteCommands.push(input);
        }
    },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { addProduct, deleteProduct } from "@/server/actions/product";

const userId = "seller-1";

function makeFormData(overrides: Record<string, string | null> = {}) {
    const fd = new FormData();
    const base: Record<string, string | null> = {
        title: "UI Kit",
        description: "A nice kit",
        price: "19.99",
        category: "UI Kits",
        images: JSON.stringify(["uploads/s1/img1.png"]),
        fileName: null,
        fileSize: null,
        storageKey: null,
        ...overrides,
    };
    for (const [key, value] of Object.entries(base)) {
        if (value !== null) fd.set(key, value);
    }
    return fd;
}

describe("addProduct", () => {
    beforeEach(() => {
        mocks.productCreate.mockResolvedValue({ id: "product-1" });
    });

    it("rejects unauthenticated users", async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await addProduct(makeFormData());

        expect(result).toEqual({ success: false, message: "Not authenticated." });
        expect(mocks.productCreate).not.toHaveBeenCalled();
    });

    it("rejects malformed images JSON", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        const result = await addProduct(makeFormData({ images: "{not-json" }));

        expect(result.success).toBe(false);
        expect(result.message).toBe("Invalid image data.");
        expect(mocks.productCreate).not.toHaveBeenCalled();
    });

    it("requires all fields including at least one image", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        const result = await addProduct(makeFormData({ title: "" }));

        expect(result.message).toBe(
            "All fields are required (including at least one image).",
        );
    });

    it("rejects an empty images array", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        const result = await addProduct(makeFormData({ images: JSON.stringify([]) }));

        expect(result.message).toBe(
            "All fields are required (including at least one image).",
        );
    });

    it("rejects a non-numeric price", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        const result = await addProduct(makeFormData({ price: "abc" }));

        expect(result.message).toBe("Price must be a positive number.");
    });

    it("rejects a negative price", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        const result = await addProduct(makeFormData({ price: "-5" }));

        expect(result.message).toBe("Price must be a positive number.");
    });

    it("creates the product without a file asset and returns its id", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        const result = await addProduct(makeFormData());

        expect(mocks.productCreate).toHaveBeenCalledWith({
            data: {
                sellerId: userId,
                title: "UI Kit",
                description: "A nice kit",
                price: 1999, // "19.99" dollars -> integer cents
                category: "UI Kits",
                images: ["uploads/s1/img1.png"],
                isPublished: true,
            },
        });
        expect(result).toEqual({
            success: true,
            message: "Product created successfully!",
            productId: "product-1",
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/studio");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    });

    it.each([
        ["19.99", 1999],
        ["0.05", 5],
        ["10", 1000],
    ])("converts price %s dollars to %i cents", async (dollars, cents) => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        await addProduct(makeFormData({ price: dollars }));

        expect(mocks.productCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ price: cents }) }),
        );
    });

    it("creates the nested file asset when upload details are provided", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        await addProduct(
            makeFormData({
                fileName: "bundle.zip",
                fileSize: "1048576",
                storageKey: "uploads/s1/uuid",
            }),
        );

        const data = mocks.productCreate.mock.calls[0][0].data;
        expect(data.fileAsset).toEqual({
            create: {
                fileName: "bundle.zip",
                fileSize: 1048576,
                storageKey: "uploads/s1/uuid",
            },
        });
    });

    it("returns failure when prisma rejects", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        mocks.productCreate.mockRejectedValue(new Error("db down"));

        const result = await addProduct(makeFormData());

        expect(result.success).toBe(false);
        expect(result.message).toContain("Failed to create product");
    });
});

describe("deleteProduct", () => {
    const productId = "product-1";

    function ownedProduct() {
        return {
            id: productId,
            sellerId: userId,
            images: ["img-a.png", "img-b.png"],
            fileAsset: { storageKey: "private-key.bin" },
        };
    }

    beforeEach(() => {
        process.env.R2_PUBLIC_BUCKET = "devcart-public";
        process.env.R2_PRIVATE_BUCKET = "devcart-private";
        mocks.r2Send.mockResolvedValue({});
        mocks.productFindUnique.mockResolvedValue(ownedProduct());
        mocks.transaction.mockResolvedValue([]);
        mocks.purchaseItemDeleteMany.mockReturnValue("tx:purchase-items");
        mocks.cartItemDeleteMany.mockReturnValue("tx:cart-items");
        mocks.fileAssetDeleteMany.mockReturnValue("tx:file-assets");
        mocks.productDelete.mockReturnValue("tx:product");
    });

    it("rejects unauthenticated users", async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await deleteProduct(productId);

        expect(result).toEqual({
            success: false,
            message: "Not authenticated.",
        });
        expect(mocks.r2Send).not.toHaveBeenCalled();
    });

    it("reports a missing product", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        mocks.productFindUnique.mockResolvedValue(null);

        const result = await deleteProduct(productId);

        expect(result).toEqual({
            success: false,
            message: "Product doesn't exist.",
        });
    });

    it("refuses to delete a product the user doesn't own", async () => {
        mocks.auth.mockResolvedValue({ user: { id: "someone-else" } });

        const result = await deleteProduct(productId);

        expect(result).toEqual({
            success: false,
            message: "You don't own the product.",
        });
        expect(mocks.r2Send).not.toHaveBeenCalled();
        expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("removes all DB rows first, then deletes R2 objects", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });

        const result = await deleteProduct(productId);

        // the DB transaction must commit before any file is destroyed
        const txOrder = mocks.transaction.mock.invocationCallOrder[0];
        const r2Order = mocks.r2Send.mock.invocationCallOrder[0];
        expect(txOrder).toBeLessThan(r2Order);

        expect(mocks.deleteCommands).toEqual([
            { Bucket: "devcart-public", Key: "img-a.png" },
            { Bucket: "devcart-public", Key: "img-b.png" },
            { Bucket: "devcart-private", Key: "private-key.bin" },
        ]);

        const txArgs = mocks.transaction.mock.calls[0][0];
        expect(txArgs).toEqual([
            "tx:purchase-items",
            "tx:cart-items",
            "tx:file-assets",
            "tx:product",
        ]);

        expect(mocks.purchaseItemDeleteMany).toHaveBeenCalledWith({
            where: { productId },
        });
        expect(mocks.cartItemDeleteMany).toHaveBeenCalledWith({
            where: { productId },
        });
        expect(mocks.fileAssetDeleteMany).toHaveBeenCalledWith({
            where: { productId },
        });
        expect(mocks.productDelete).toHaveBeenCalledWith({
            where: { id: productId },
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/studio");
        expect(result.success).toBe(true);
        expect(result.message).toContain(productId);
    });

    it("never touches R2 when the DB transaction fails", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        mocks.transaction.mockRejectedValue(new Error("fk constraint"));

        const result = await deleteProduct(productId);

        expect(result.success).toBe(false);
        // generic message — must not leak internals to the client
        expect(result.message).toBe("Unable to delete product. Please try again.");
        expect(result.message).not.toContain("fk constraint");
        expect(mocks.r2Send).not.toHaveBeenCalled();
    });

    it("skips R2 cleanup when the bucket env vars are missing", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        delete process.env.R2_PUBLIC_BUCKET;
        delete process.env.R2_PRIVATE_BUCKET;
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await deleteProduct(productId);

        expect(result.success).toBe(true);
        expect(mocks.transaction).toHaveBeenCalled();
        expect(mocks.r2Send).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
    });

    it("still succeeds when R2 cleanup fails after a committed transaction", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mocks.r2Send.mockRejectedValue(new Error("r2 unreachable"));

        const result = await deleteProduct(productId);

        expect(result.success).toBe(true);
        expect(mocks.transaction).toHaveBeenCalled();
        // failures are logged, not thrown
        expect(consoleError).toHaveBeenCalled();
    });

    it("returns failure when the DB transaction fails", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        mocks.transaction.mockRejectedValue(new Error("fk constraint"));

        const result = await deleteProduct(productId);

        expect(result.success).toBe(false);
        expect(result.message).toBe("Unable to delete product. Please try again.");
    });
});
