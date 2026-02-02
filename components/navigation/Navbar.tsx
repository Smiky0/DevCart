import { ShoppingCart } from "lucide-react";
import SearchBar from "./SearchBar";
import Link from "next/link";
import { auth } from "@/lib/auth";
import UserLogin from "../products/buttons/UserBtn";

export default async function Navbar() {
    const session = await auth();

    return (
        <div className="min-w-xs flex flex-col justify-between items-center mb-6 gap-4">
            <div className="w-full flex justify-between items-center rounded-full text-2xl px-6 py-2 gap-2 bg-black/80 shadow-lg shadow-black/40 border-2 border-white/60">
                <Link
                    href={"/"}
                    className="text-white text-shadow-lg font-mono"
                >
                    DevCart
                </Link>
                <span className="hidden md:flex">
                    <SearchBar />
                </span>
                <div className="flex gap-4 justify-center items-center">
                    <UserLogin userSession={session} />
                    <Link 
                        href={"/cart"}
                        className="hidden md:flex justify-center items-center bg-yellow-400 hover:bg-yellow-400/90 transition-all duration-300 ease-in-out p-2 px-5 rounded-full cursor-pointer"
                    >
                        <ShoppingCart color="black" />
                    </Link>
                </div>
            </div>
            <span className="flex md:hidden p-1 bg-black rounded-4xl">
                <SearchBar />
            </span>
        </div>
    );
}
