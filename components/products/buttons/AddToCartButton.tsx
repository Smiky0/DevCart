"use client";

import { addToCart } from "@/server/actions/cart";
import { ShoppingCart } from "lucide-react";
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
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-black border-2 border-white/40 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 active:scale-95 hover:border-white/90 cursor-pointer"
            >
                <ShoppingCart className="h-4 w-4" />
                {productAdded ? "Added" : "Add to Cart"}
            </button>
        </div>
    );
}

export default AddToCartButton;
