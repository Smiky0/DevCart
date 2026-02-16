"use client";

import { removeFromCart } from "@/server/actions/cart";
import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

function RemoveFromCart({
    userId,
    cartItemId,
}: {
    userId?: string;
    cartItemId: string;
}) {
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();

    const handleOnClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        setLoading(true);
        // if userId is not passed; ask to login
        if (!userId) {
            router.push("/api/auth/signin");
            return;
        }

        const result = await removeFromCart(userId, cartItemId);
        setLoading(false);
        // alert(result.message);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div>
            <button
                onClick={handleOnClick}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-danger/15 border border-danger/20 text-danger px-8 py-3 text-sm font-semibold shadow-md shadow-danger/30 transition-all duration-200 hover:bg-danger hover:text-white hover:shadow-lg hover:shadow-danger/40 active:scale-95 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            >
                <ShoppingCartSimpleIcon className="h-4 w-4" weight="duotone" />
                {"Remove"}
            </button>
        </div>
    );
}

export default RemoveFromCart;
