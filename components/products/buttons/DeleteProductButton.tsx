"use client";

import { deleteProduct } from "@/server/actions/product";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TrashIcon, XIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";

export default function DeleteProductButton({
    productId,
}: {
    productId: string;
}) {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteProduct(productId);
        setLoading(false);
        setShowModal(false);

        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    return (
        <>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowModal(true);
                }}
                disabled={loading}
                className="p-2 rounded-lg text-red-400 hover:text-danger group hover:bg-red-100 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete product"
            >
                <TrashIcon size={18} weight="duotone" />
            </motion.button>

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center bg-foreground/30 backdrop-blur-sm z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => !loading && setShowModal(false)}
                    >
                        <motion.div
                            className="bg-surface rounded-2xl w-full max-w-95 mx-4 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.2)] border border-border/40 overflow-hidden"
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 8 }}
                            transition={{ duration: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Top accent bar */}
                            <motion.div
                                className="h-1 bg-danger"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                style={{ originX: 0 }}
                            />

                            <div className="p-6">
                                {/* Icon */}
                                <motion.div
                                    className="w-12 h-12 rounded-full bg-danger/8 flex items-center justify-center mb-5"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        duration: 0.35,

                                        delay: 0.08,
                                    }}
                                >
                                    <WarningIcon
                                        className="text-danger"
                                        size={22}
                                        weight="duotone"
                                    />
                                </motion.div>

                                {/* Copy */}
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.3,

                                        delay: 0.12,
                                    }}
                                >
                                    <h3 className="text-base font-semibold text-foreground mb-1.5">
                                        Delete this product?
                                    </h3>
                                    <p className="text-sm text-muted leading-relaxed">
                                        This will permanently remove the product
                                        and all associated data. This action
                                        cannot be undone.
                                    </p>
                                </motion.div>

                                {/* Actions */}
                                <motion.div
                                    className="flex items-center justify-end gap-2.5 mt-6"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{
                                        duration: 0.25,
                                        delay: 0.2,
                                    }}
                                >
                                    <button
                                        onClick={() => setShowModal(false)}
                                        disabled={loading}
                                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/80 outline outline-foreground/20 hover:text-foreground rounded-lg hover:bg-foreground/4 active:bg-foreground/30 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                                    >
                                        <XIcon size={16} weight="bold" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="relative px-4 py-2 text-sm font-medium text-surface bg-danger rounded-lg hover:brightness-110 active:brightness-95 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed overflow-hidden flex items-center gap-2"
                                    >
                                        {loading && (
                                            <motion.span
                                                className="absolute inset-0 bg-surface/10"
                                                animate={{ x: ["0%", "100%"] }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 0.8,
                                                    ease: "linear",
                                                }}
                                            />
                                        )}
                                        <TrashIcon size={16} weight="bold" />
                                        <span>
                                            {loading ? "Deleting…" : "Delete"}
                                        </span>
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
