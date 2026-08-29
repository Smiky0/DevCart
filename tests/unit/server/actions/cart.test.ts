import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    cartFindUnique: vi.fn(),
    cartCreate: vi.fn(),
    cartItemFindFirst: vi.fn(),
    cartItemCreate: vi.fn(),
    cartItemDeleteMany: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/prisma", () => ({
    default: {
        cart: {
            findUnique: mocks.cartFindUnique,
            create: mocks.cartCreate,
        },
        cartItem: {
            findFirst: mocks.cartItemFindFirst,
            create: mocks.cartItemCreate,
            deleteMany: mocks.cartItemDeleteMany,
        },
    },
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { addToCart, getCart, removeFromCart } from "@/server/actions/cart";

const userId = "user-1";
const productId = "product-1";

describe("getCart", () => {
    it("returns the cart with items and products for the session user", async () => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        const cart = { id: "cart-1", items: [] };
        mocks.cartFindUnique.mockResolvedValue(cart);

        const result = await getCart();

        expect(result).toBe(cart);
        expect(mocks.cartFindUnique).toHaveBeenCalledWith({
            where: { userId },
            include: { items: { include: { product: true } } },
        });
    });

    it("returns null for unauthenticated users without touching the db", async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await getCart();

        expect(result).toBeNull();
        expect(mocks.cartFindUnique).not.toHaveBeenCalled();
    });
});

describe("addToCart", () => {
    beforeEach(() => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
        mocks.cartCreate.mockResolvedValue({ id: "cart-new" });
    });

    it("rejects unauthenticated users", async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await addToCart(productId);

        expect(result).toEqual({
            success: false,
            message: "Not authenticated.",
        });
        expect(mocks.cartFindUnique).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("adds an item to an existing cart and revalidates /cart", async () => {
        mocks.cartFindUnique.mockResolvedValue({ id: "cart-1" });
        mocks.cartItemFindFirst.mockResolvedValue(null);
        mocks.cartItemCreate.mockResolvedValue({ id: "ci-1" });

        const result = await addToCart(productId);

        expect(result).toEqual({
            success: true,
            status: "added",
            message: "Item added.",
        });
        expect(mocks.cartItemCreate).toHaveBeenCalledWith({
            data: { cartId: "cart-1", productId },
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/cart", "page");
    });

    it("creates a cart first when the user has none, then adds the item", async () => {
        mocks.cartFindUnique.mockResolvedValue(null);
        mocks.cartItemFindFirst.mockResolvedValue(null);
        mocks.cartItemCreate.mockResolvedValue({ id: "ci-1" });

        const result = await addToCart(productId);

        expect(mocks.cartCreate).toHaveBeenCalledWith({ data: { userId } });
        expect(mocks.cartItemFindFirst).toHaveBeenCalledWith({
            where: { productId, cartId: "cart-new" },
        });
        expect(mocks.cartItemCreate).toHaveBeenCalledWith({
            data: { cartId: "cart-new", productId },
        });
        expect(result.success).toBe(true);
    });

    it("reports 'exist' without creating a duplicate cart item", async () => {
        mocks.cartFindUnique.mockResolvedValue({ id: "cart-1" });
        mocks.cartItemFindFirst.mockResolvedValue({ id: "ci-existing" });

        const result = await addToCart(productId);

        expect(result).toEqual({
            success: true,
            status: "exist",
            message: "Item already exists in your cart!",
        });
        expect(mocks.cartItemCreate).not.toHaveBeenCalled();
    });

    it("returns failure when creating the cart item throws", async () => {
        mocks.cartFindUnique.mockResolvedValue({ id: "cart-1" });
        mocks.cartItemFindFirst.mockRejectedValue(new Error("db down"));

        const result = await addToCart(productId);

        expect(result).toEqual({
            success: false,
            message: "Unable to add item to your cart!",
        });
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
});

describe("removeFromCart", () => {
    beforeEach(() => {
        mocks.auth.mockResolvedValue({ user: { id: userId } });
    });

    it("rejects unauthenticated users", async () => {
        mocks.auth.mockResolvedValue(undefined);

        const result = await removeFromCart("ci-1");

        expect(result).toEqual({
            success: false,
            message: "Not authenticated.",
        });
        expect(mocks.cartItemDeleteMany).not.toHaveBeenCalled();
    });

    it("removes an item that belongs to the user's cart", async () => {
        mocks.cartFindUnique.mockResolvedValue({ id: "cart-1" });
        mocks.cartItemDeleteMany.mockResolvedValue({ count: 1 });

        const result = await removeFromCart("ci-1");

        expect(result).toEqual({
            success: true,
            message: "Item removed from cart!",
        });
        expect(mocks.cartItemDeleteMany).toHaveBeenCalledWith({
            where: { id: "ci-1", cartId: "cart-1" },
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/cart", "page");
    });

    it("fails when the user has no cart", async () => {
        mocks.cartFindUnique.mockResolvedValue(null);

        const result = await removeFromCart("ci-1");

        expect(result.success).toBe(false);
        expect(mocks.cartItemDeleteMany).not.toHaveBeenCalled();
    });

    it("fails when nothing was deleted (item not in user's cart)", async () => {
        mocks.cartFindUnique.mockResolvedValue({ id: "cart-1" });
        mocks.cartItemDeleteMany.mockResolvedValue({ count: 0 });

        const result = await removeFromCart("ci-other");

        expect(result.success).toBe(false);
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/cart", "page");
    });

    it("still revalidates /cart on unexpected errors", async () => {
        mocks.cartFindUnique.mockRejectedValue(new Error("db down"));

        const result = await removeFromCart("ci-1");

        expect(result.success).toBe(false);
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/cart", "page");
    });
});
