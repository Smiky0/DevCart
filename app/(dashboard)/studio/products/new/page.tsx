"use client";

import { addProduct } from "@/server/actions/product";
import {
    ArrowLeft,
    ImageIcon,
    Package,
    DollarSign,
    Tag,
    FileText,
    Upload,
    File,
    X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

const CATEGORIES = [
    "Templates",
    "Icons",
    "Education",
    "UI Kits",
    "Illustrations",
    "Fonts",
    "Plugins",
    "Other",
];

function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function NewProductPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Cover images state (stored as base64 data URLs)
    const [coverImages, setCoverImages] = useState<string[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // File asset state
    const [fileAsset, setFileAsset] = useState<{
        fileName: string;
        fileSize: number;
        storageKey: string;
    } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleImageUpload = useCallback(async (files: FileList | File[]) => {
        setIsUploadingImage(true);
        try {
            for (const file of Array.from(files)) {
                if (!file.type.startsWith("image/")) {
                    toast.error(`"${file.name}" is not an image`);
                    continue;
                }
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                if (!res.ok) throw new Error("Upload failed");
                const data = await res.json();
                setCoverImages((prev) => [...prev, data.storageKey]);
            }
        } catch {
            toast.error("Failed to upload image(s)");
        } finally {
            setIsUploadingImage(false);
        }
    }, []);

    const handleFileUpload = useCallback(async (file: File) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }

            const data = await res.json();
            setFileAsset({
                fileName: data.fileName,
                fileSize: data.fileSize,
                storageKey: data.storageKey,
            });
            toast.success(`"${data.fileName}" uploaded`);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to upload file",
            );
        } finally {
            setIsUploading(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
        },
        [handleFileUpload],
    );

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (coverImages.length === 0) {
            toast.error("Please upload at least one cover image.");
            return;
        }

        const formData = new FormData(e.currentTarget);

        // Append cover images as JSON
        formData.append("images", JSON.stringify(coverImages));

        // Append file asset data as hidden fields
        if (fileAsset) {
            formData.append("fileName", fileAsset.fileName);
            formData.append("fileSize", String(fileAsset.fileSize));
            formData.append("storageKey", fileAsset.storageKey);
        }

        startTransition(async () => {
            const result = await addProduct(formData);
            if (result.success) {
                toast.success(result.message);
                router.push("/studio");
            } else {
                toast.error(result.message);
            }
        });
    };

    return (
        <div className="py-6 m-2 md:m-4 animate-fade-in-up">
            {/* Back link */}
            <Link
                href="/studio"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 group mb-8"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="mb-8 mt-4">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                    New Product
                </h1>
                <p className="text-muted mt-1">
                    Fill in the details to list a new digital product.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column — Product Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
                            <h2 className="text-lg font-semibold text-foreground">
                                Product Details
                            </h2>

                            {/* Title */}
                            <div>
                                <label
                                    htmlFor="title"
                                    className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
                                >
                                    <Package
                                        size={15}
                                        className="text-primary"
                                    />
                                    Product Title
                                </label>
                                <input
                                    id="title"
                                    name="title"
                                    type="text"
                                    required
                                    placeholder="e.g. Modern Dashboard UI Kit"
                                    className="w-full rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label
                                    htmlFor="description"
                                    className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
                                >
                                    <FileText
                                        size={15}
                                        className="text-primary"
                                    />
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    required
                                    rows={5}
                                    placeholder="Describe what's included, features, and use cases..."
                                    className="w-full rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>

                            {/* Price & Category row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Price */}
                                <div>
                                    <label
                                        htmlFor="price"
                                        className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
                                    >
                                        <DollarSign
                                            size={15}
                                            className="text-primary"
                                        />
                                        Price (USD)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted font-medium">
                                            $
                                        </span>
                                        <input
                                            id="price"
                                            name="price"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            placeholder="0.00"
                                            className="w-full rounded-xl border border-border/60 bg-surface-alt/50 pl-8 pr-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label
                                        htmlFor="category"
                                        className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
                                    >
                                        <Tag
                                            size={15}
                                            className="text-primary"
                                        />
                                        Category
                                    </label>
                                    <select
                                        id="category"
                                        name="category"
                                        required
                                        defaultValue=""
                                        className="w-full rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none"
                                    >
                                        <option value="" disabled>
                                            Select a category
                                        </option>
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* File Asset Upload Card */}
                        <div className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Upload size={18} className="text-primary" />
                                Digital File
                            </h2>
                            <p className="text-xs text-muted">
                                Upload the file buyers will receive after
                                purchase. Any file type is accepted.
                            </p>

                            {!fileAsset ?
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={handleDrop}
                                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 px-6 transition-all duration-200 cursor-pointer ${
                                        dragActive ?
                                            "border-primary bg-primary/5"
                                        :   "border-border/60 hover:border-primary/40 hover:bg-surface-alt/40"
                                    }`}
                                >
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload(file);
                                        }}
                                        disabled={isUploading}
                                    />
                                    {isUploading ?
                                        <>
                                            <span className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
                                            <p className="text-sm font-medium text-foreground">
                                                Uploading...
                                            </p>
                                        </>
                                    :   <>
                                            <Upload
                                                size={28}
                                                className="text-muted mb-3"
                                            />
                                            <p className="text-sm font-medium text-foreground">
                                                Drop your file here or{" "}
                                                <span className="text-primary">
                                                    browse
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted mt-1">
                                                ZIP, PDF, PSD, AI, Figma, MP4,
                                                or any format
                                            </p>
                                        </>
                                    }
                                </div>
                            :   <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-surface-alt/40 p-4">
                                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
                                        <File size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {fileAsset.fileName}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {formatFileSize(fileAsset.fileSize)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFileAsset(null)}
                                        className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            }
                        </div>
                    </div>

                    {/* Right Column — Images & Actions */}
                    <div className="space-y-6">
                        {/* Cover Images Card */}
                        <div className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <ImageIcon size={18} className="text-primary" />
                                Cover Images
                            </h2>
                            <p className="text-xs text-muted">
                                Upload one or more images. The first image will
                                be used as the thumbnail.
                            </p>

                            {/* Upload zone */}
                            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-surface-alt/40 py-8 px-4 transition-all duration-200 cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (
                                            e.target.files &&
                                            e.target.files.length > 0
                                        ) {
                                            handleImageUpload(e.target.files);
                                        }
                                    }}
                                    disabled={isUploadingImage}
                                />
                                {isUploadingImage ?
                                    <>
                                        <span className="h-7 w-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
                                        <p className="text-sm font-medium text-foreground">
                                            Uploading...
                                        </p>
                                    </>
                                :   <>
                                        <Upload
                                            size={24}
                                            className="text-muted mb-2"
                                        />
                                        <p className="text-sm font-medium text-foreground">
                                            Drop images or{" "}
                                            <span className="text-primary">
                                                browse
                                            </span>
                                        </p>
                                        <p className="text-xs text-muted mt-0.5">
                                            PNG, JPG, WEBP, SVG
                                        </p>
                                    </>
                                }
                            </div>

                            {/* Image previews grid */}
                            {coverImages.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {coverImages.map((img, i) => (
                                        <div
                                            key={i}
                                            className="relative group/img aspect-4/3 rounded-lg overflow-hidden border border-border/60 bg-surface-alt"
                                        >
                                            <Image
                                                src={img}
                                                alt={`Cover ${i + 1}`}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                            {i === 0 && (
                                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold uppercase">
                                                    Thumbnail
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCoverImages((prev) =>
                                                        prev.filter(
                                                            (_, j) => j !== i,
                                                        ),
                                                    )
                                                }
                                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer hover:bg-danger"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions Card */}
                        <div className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6 space-y-3">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-surface text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isPending ?
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="h-4 w-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                                        Creating...
                                    </span>
                                :   "Create Product"}
                            </button>
                            <Link
                                href="/studio"
                                className="block text-center w-full px-5 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface-alt transition-colors duration-200"
                            >
                                Cancel
                            </Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
