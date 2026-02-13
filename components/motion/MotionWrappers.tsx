"use client";
import { motion } from "framer-motion";
import { type ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * Wraps a card with staggered fade-in entrance animation.
 * Pass `index` to create a stagger effect across siblings.
 */
export function AnimatedCard({
    children,
    index = 0,
}: {
    children: ReactNode;
    index?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.45,
                delay: index * 0.08,
                ease,
            }}
        >
            {children}
        </motion.div>
    );
}

/**
 * Generic fade-in with directional slide.
 */
export function FadeIn({
    children,
    delay = 0,
    direction = "up",
    className = "",
}: {
    children: ReactNode;
    delay?: number;
    direction?: "up" | "down" | "left" | "right";
    className?: string;
}) {
    const offsets = {
        up: { y: 20, x: 0 },
        down: { y: -20, x: 0 },
        left: { y: 0, x: -24 },
        right: { y: 0, x: 24 },
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...offsets[direction] }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.5, delay, ease }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Scale-in animation — great for images and hero elements.
 */
export function ScaleIn({
    children,
    delay = 0,
    className = "",
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay, ease }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Animated counter for prices/numbers — provides a pop effect.
 */
export function PopIn({
    children,
    delay = 0,
    className = "",
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 20,
                delay,
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
