"use client";
import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
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
    const handleSignOut = async () => {
        await signOut();
        setIsOpen(false);
    };
    const handleSignIn = () => {
        router.push("/api/auth/signin");
    };

    return (
        <div className="flex items-center justify-center bg-white/80 border-2 border-black px-2 py-1 rounded-full text-base font-medium font-mono text-black relative">
            {!!userSession ?
                <div className="flex justify-center items-center gap-2">
                    <span className="hidden md:flex px-2 rounded-full">
                        Hi, {userSession.user?.name || "User"}
                    </span>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className={`flex items-center justify-center gap-1 px-3 py-1 border border-white rounded-full cursor-pointer transition-all duration-300 ease-in-out 
                                ${isOpen ? "bg-green-500 border-green-600" : "bg-green-400/90 hover:bg-green-500"}`}
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            <User color="black" />
                            <ChevronDown
                                color="black"
                                size={18}
                                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 p-2 bg-white border-2 border-black/30 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 transition-all duration-500 ease-in-out">
                                <div className="py-1">
                                    <button
                                        onClick={handleDashboard}
                                        className="w-full text-left px-4 py-2 text-sm text-black cursor-pointer hover:bg-gray-300 flex items-center gap-2 transition-colors rounded-lg"
                                    >
                                        <LayoutDashboard
                                            size={16}
                                            className="text-black"
                                        />
                                        Dashboard
                                    </button>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-200 flex items-center gap-2 transition-colors rounded-lg"
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
                    <div className="px-2 rounded-full">{"Hi, User"}</div>
                    <span
                        className="px-3 py-1 bg-green-400 hover:border-white hover:bg-green-500 transition-all duration-300 ease-in-out border rounded-2xl cursor-pointer"
                        onClick={handleSignIn}
                    >
                        Sign In
                    </span>
                </div>
            }
        </div>
    );
}
