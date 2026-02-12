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
            className="rounded-xl bg-success hover:bg-success/90 px-6 py-3 font-bold text-sm text-white cursor-pointer transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md"
        >
            Buy Now for ${price.toFixed(2)}
        </button>
    );
}
