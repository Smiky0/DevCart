"use client";
import { Toaster } from "sonner";

function ToastProvider() {
    return (
        <Toaster
            theme="dark"
            position="bottom-center"
            richColors={true}
            toastOptions={{
                style: {
                    borderRadius: "18px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(255, 109, 77, 0.08)",
                },
            }}
        />
    );
}

export default ToastProvider;
