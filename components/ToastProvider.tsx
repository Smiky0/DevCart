"use client";
import { Toaster } from "sonner";

function ToastProvider() {
    return (
        <Toaster
            theme="dark"
            position="bottom-center"
            richColors={true}
        />
    );
}

export default ToastProvider;
