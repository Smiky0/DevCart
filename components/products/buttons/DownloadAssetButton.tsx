"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function DownloadAssetButton({
    assetId,
    fileName,
}: {
    assetId?: string;
    fileName?: string;
}) {
    const [downloading, setDownloading] = useState(false);

    async function handleDownload(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (!assetId) {
            toast.error("No file available", {
                description: "This product doesn't have a downloadable asset.",
            });
            return;
        }

        setDownloading(true);

        try {
            const res = await fetch(`/api/download/${assetId}`);

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(
                    data?.error || "Couldn't download — file may not exist.",
                );
            }

            // Trigger browser download from the response blob
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName || "download";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            toast.success("Download complete", {
                description: `${fileName || "File"} downloaded successfully.`,
            });
        } catch (err) {
            toast.error("Download failed", {
                description:
                    err instanceof Error ?
                        err.message
                    :   "No file exists or couldn't download.",
            });
        } finally {
            setDownloading(false);
        }
    }

    return (
        <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/30 transition-all duration-200 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/40 active:scale-95 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
        >
            <Download
                size={16}
                strokeWidth={2.5}
                className={downloading ? "animate-bounce" : ""}
            />
            {downloading ? "Downloading…" : "Download"}
        </button>
    );
}
