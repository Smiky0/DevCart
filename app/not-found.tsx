import Link from "next/link";
import { HouseIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] py-16 animate-fade-in-up">
            {/* 404 number */}
            <div className="relative mb-6 select-none">
                <span className="text-[10rem] sm:text-[14rem] font-extrabold leading-none tracking-tighter text-primary/10">
                    404
                </span>
                <span className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                    Oops!
                </span>
            </div>

            {/* Message */}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight text-center mb-3">
                Page not found
            </h1>
            <p className="text-muted text-center max-w-md mb-10 text-base">
                The page you&apos;re looking for doesn&apos;t exist or has been
                moved. Let&apos;s get you back on track.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/30 transition-all duration-200 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/40 active:scale-95"
                >
                    <HouseIcon size={18} weight="duotone" />
                    Back to Home
                </Link>
                <Link
                    href="/?q="
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-border/60 bg-surface px-6 py-3 text-sm font-semibold text-foreground/80 shadow-sm transition-all duration-200 hover:border-primary/40 hover:text-primary active:scale-95"
                >
                    <MagnifyingGlassIcon size={18} weight="duotone" />
                    Browse Products
                </Link>
            </div>
        </div>
    );
}
