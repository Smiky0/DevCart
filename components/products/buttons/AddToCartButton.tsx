"use client";

import { addToCart } from "@/server/actions/cart";
import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

function AddToCartButton({
    userId,
    productId,
}: {
    userId?: string;
    productId: string;
}) {
    const [loading, setLoading] = useState<boolean>(false);
    const [productAdded, setProductAdded] = useState<boolean>(false);
    const router = useRouter();

    const handleOnClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        setLoading(true);
        // if user doesnt exist then ask to login
        if (!userId) {
            router.push("/api/auth/signin");
            return;
        }
        // if user and product id exist; add to cart :)
        const result = await addToCart(userId, productId);
        setLoading(false);

        // if added or exists
        if (result.success) {
            setProductAdded(true);
            if (result.status == "added") toast.success(result.message);
            if (result.status == "exist") toast.info(result.message);
        }
        // not added
        else {
            toast.error(result.message);
        }
        // alert(result.message);
    };

    return (
        <div>
            <button
                onClick={handleOnClick}
                disabled={productAdded || loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/40 active:scale-95 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            >
                <ShoppingCartSimpleIcon className="h-4 w-4" weight="duotone" />
                {productAdded ? "Added to Cart" : "Add to Cart"}
            </button>
        </div>
    );
}

export default AddToCartButton;
