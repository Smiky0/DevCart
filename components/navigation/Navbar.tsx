import Link from "next/link";
import { auth } from "@/lib/auth";
import UserLogin from "../products/buttons/UserBtn";
import { ShoppingCartSimpleIcon } from "@phosphor-icons/react/dist/ssr";

export default async function Navbar() {
    const session = await auth();

    return (
        <header className="sticky top-0 z-50 w-full">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-3">
                <div className="flex items-center justify-between gap-4 rounded-4xl bg-white/60 backdrop-blur-xl shadow-lg shadow-orange-500/5 border border-white px-6 py-2 lg:py-3">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors duration-200"
                    >
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white text-sm font-black">
                            D
                        </span>
                        <span className="hidden sm:inline font-mono">
                            DevCart
                        </span>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <UserLogin userSession={session} />
                        <Link
                            href="/cart"
                            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/60 hover:bg-primary/80 text-white transition-all duration-200 hover:scale-105"
                        >
                            <ShoppingCartSimpleIcon size={20} weight="bold"/>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
