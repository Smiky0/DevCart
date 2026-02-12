"use client";
import {
    ChevronDown,
    LayoutDashboard,
    LogOut,
    ShoppingBag,
    User,
} from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function UserLogin({
    userSession,
}: {
    userSession: Session | null;
}) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // dropdown will close if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    const handleDashboard = () => {
        router.push("/studio");
        setIsOpen(false);
    };
    const handleOrders = () => {
        router.push("/orders");
        setIsOpen(false);
    };
    const handleSignOut = async () => {
        await signOut();
        setIsOpen(false);
    };
    const handleSignIn = () => {
        router.push("/api/auth/signin");
    };

    return (
        <div className="flex items-center relative">
            {!!userSession ?
                <div className="flex justify-center items-center gap-2">
                    <span className="hidden md:flex font-mono text-base font-meduim text-black/80 px-2">
                        Hi, {userSession.user?.name?.split(" ")[0] || "User"}
                    </span>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-4xl text-white border border-primary cursor-pointer transition-all duration-200
                                ${isOpen ? "bg-primary/80 shadow-md" : "bg-primary/60 hover:bg-primary/80"}`}
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            <User size={18} />
                            <ChevronDown
                                size={14}
                                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 p-1.5 bg-white border border-border/60 rounded-3xl shadow-xl shadow-orange-500/10 z-50 overflow-hidden">
                                <div className="py-1">
                                    <button
                                        onClick={handleDashboard}
                                        className="w-full text-left px-4 py-2.5 text-sm text-black/80 cursor-pointer group hover:bg-primary hover:text-white hover:font-semibold flex items-center gap-3 transition-colors rounded-2xl"
                                    >
                                        <LayoutDashboard
                                            size={16}
                                            className="text-primary group-hover:text-white"
                                        />
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={handleOrders}
                                        className="w-full text-left px-4 py-2.5 text-sm text-black/80 cursor-pointer group hover:bg-primary hover:text-white hover:font-semibold flex items-center gap-3 transition-colors rounded-2xl"
                                    >
                                        <ShoppingBag
                                            size={16}
                                            className="text-primary group-hover:text-white"
                                        />
                                        Your Orders
                                    </button>

                                    <div className="h-px bg-border my-1 mx-2" />

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-500 hover:text-white flex items-center gap-3 transition-colors rounded-2xl"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            :   <div className="flex justify-center items-center gap-2">
                    <span
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 rounded-xl cursor-pointer shadow-sm hover:shadow-md"
                        onClick={handleSignIn}
                    >
                        Sign In
                    </span>
                </div>
            }
        </div>
    );
}
