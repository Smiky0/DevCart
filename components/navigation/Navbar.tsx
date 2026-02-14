import Link from "next/link";
import { auth } from "@/lib/auth";
import UserLogin from "../products/buttons/UserBtn";
import AnimatedCartButton from "./AnimatedCartButton";

export default async function Navbar() {
    const session = await auth();

    return (
        <header className="sticky top-0 z-50 w-full">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-3">
                <div className="flex items-center justify-between gap-4 rounded-4xl bg-surface shadow-lg shadow-black/15 border border-border px-6 py-2 lg:py-3">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors duration-200"
                    >
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-surface text-sm font-foreground">
                            D
                        </span>
                        <span className="hidden sm:inline font-mono">
                            DevCart
                        </span>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <UserLogin userSession={session} />
                        <AnimatedCartButton />
                    </div>
                </div>
            </div>
        </header>
    );
}
