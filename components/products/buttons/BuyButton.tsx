"use client"; // This must be a client component to handle clicks

import { motion } from "framer-motion";
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
            // console.error("Purchase error:", error);
            toast.error(
                error instanceof Error ? error.message : "Purchase failed",
            );
        }
    };
    return (
        <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={handleBuy}
            className="rounded-xl bg-success hover:bg-success/90 px-6 py-3 font-bold text-sm text-white cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-md"
        >
            Buy Now for ${price.toFixed(2)}
        </motion.button>
    );
}
