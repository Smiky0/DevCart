"use client";

import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { motion, useAnimation } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AnimatedCartButton() {
    const controls = useAnimation();
    const router = useRouter();

    const handleClick = async () => {
        // Spring forward — low damping gives a natural overshoot & bounce back
        await controls.start({
            x: [0, 6],
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 8,
                mass: 0.5,
            },
        });
        await controls.start({
            x: 0,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 14,
                mass: 0.5,
            },
        });
        router.push("/cart");
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center justify-center px-4 py-2 rounded-4xl bg-primary hover:bg-primary-dark text-surface cursor-pointer transition-colors duration-200"
        >
            <motion.span
                animate={controls}
                className="flex items-center justify-center gap-2"
            >
                <ShoppingCartSimpleIcon size={20} weight="duotone" />
            </motion.span>
        </button>
    );
}
