"use client"; // This must be a client component to handle clicks

import { processOrder } from "@/lib/purchase";
import { toast } from "sonner";

export function BuyButton({ price }: { price: number }) {
    const handleBuy = async () => {
        try {
            const result = await processOrder();
            if (result.sucess) {
                toast.success(
                    "Buying sucessful! Transaction ID: " + result.purchaseId,
                );
            }
        } catch (error) {
            console.error("Purchase error:", error);
            toast.error(
                error instanceof Error ? error.message : "Purchase failed",
            );
        }
    };
    return (
        <button
            onClick={handleBuy}
            className="rounded-2xl border-2 border-black/40 px-4 py-2 bg-green-300 font-bold text-base cursor-pointer"
        >
            Buy Now for ${price.toFixed(2)}
        </button>
    );
}
