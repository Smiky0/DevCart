"use client";

import { deleteProduct } from "@/server/actions/product";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DeleteProductButton({
    productId,
}: {
    productId: string;
}) {
    const [loading, setLoading] = useState(false);
    const [modal, visibleModal] = useState<boolean>(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm(
            "Are you sure you want to delete this product? This action cannot be undone.",
        );
        if (!confirmed) return;

        setLoading(true);
        const result = await deleteProduct(productId);
        setLoading(false);

        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    return (
        <>
            <button
                onClick={handleDelete}
                disabled={loading}
                className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete product"
            >
                <Trash2 size={16} />
            </button>
            {modal && (
                <div className="ixed inset-0 flex flex-col justify-center items-center bg-gray-900 bg-opacity-50 z-50">
                    hello
                </div>
            )}
        </>
    );
}
