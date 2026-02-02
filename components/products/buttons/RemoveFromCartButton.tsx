"use client";

import { removeFromCart } from "@/server/actions/cart";
import { ShoppingCart } from "lucide-react";
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
                className="flex items-center gap-2 rounded-lg bg-black border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 active:scale-95 hover:bg-red-700 cursor-pointer"
            >
                <ShoppingCart className="h-4 w-4" />
                {"Remove from Cart"}
            </button>
        </div>
    );
}

export default RemoveFromCart;
