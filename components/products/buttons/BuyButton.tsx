"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function BuyButton({ price }: { price: number }) {
    const [loading, setLoading] = useState(false);

    const handleBuy = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/checkout", { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Checkout failed");
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url;
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Checkout failed",
            );
            setLoading(false);
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={handleBuy}
            disabled={loading}
            className="rounded-4xl bg-primary/90 hover:bg-primary px-6 py-3 font-bold text-sm text-surface cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {loading ? "Redirecting..." : `Buy Now for $${price.toFixed(2)}`}
        </motion.button>
    );
}
