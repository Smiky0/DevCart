"use client";
import {
    CaretDownIcon,
    LayoutIcon,
    ShoppingBagIcon,
    SignOutIcon,
    UserIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
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
                    <span className="hidden md:flex font-mono text-base font-medium text-foreground/90 px-2">
                        Hi, {userSession.user?.name?.split(" ")[0] || "User"}
                    </span>
                    <div className="relative" ref={dropdownRef}>
                        <motion.button
                            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-4xl text-surface border border-primary/40 cursor-pointer transition-colors duration-200
                                ${isOpen ? "bg-primary shadow-md" : "bg-primary/80 hover:bg-primary"}`}
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            <UserIcon size={18} weight="duotone" />
                            <motion.span
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{
                                    type: "tween",
                                    stiffness: 10,
                                    damping: 0,
                                }}
                                className="flex items-center"
                            >
                                <CaretDownIcon size={14} weight="duotone" />
                            </motion.span>
                        </motion.button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 30,
                                        mass: 0.8,
                                    }}
                                    style={{ transformOrigin: "top right" }}
                                    className="absolute right-0 top-full mt-2 w-52 p-1.5 bg-surface border border-border/60 rounded-3xl shadow-xl shadow-foreground/10 z-50 overflow-hidden"
                                >
                                    <div className="py-1">
                                        {[
                                            {
                                                icon: LayoutIcon,
                                                label: "Dashboard",
                                                onClick: handleDashboard,
                                            },
                                            {
                                                icon: ShoppingBagIcon,
                                                label: "Your Orders",
                                                onClick: handleOrders,
                                            },
                                        ].map((item, i) => (
                                            <motion.button
                                                key={item.label}
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                    delay: 0.05 * (i + 1),
                                                    duration: 0.5,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
                                                onClick={item.onClick}
                                                className="w-full text-left px-4 py-2.5 text-sm text-foreground cursor-pointer group hover:bg-primary hover:text-surface hover:font-semibold flex items-center gap-3 transition-colors rounded-2xl"
                                            >
                                                <item.icon
                                                    size={16}
                                                    weight="bold"
                                                    className="text-primary group-hover:text-surface"
                                                />
                                                {item.label}
                                            </motion.button>
                                        ))}

                                        <div className="h-px bg-border my-1 mx-2" />

                                        <motion.button
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                delay: 0.2,
                                                duration: 0.5,
                                                ease: [0.22, 1, 0.36, 1],
                                            }}
                                            onClick={handleSignOut}
                                            className="w-full px-4 py-2.5 text-sm text-red-600 cursor-pointer hover:bg-red-500 hover:text-surface hover:font-semibold flex items-center gap-3 transition-colors rounded-2xl"
                                        >
                                            <SignOutIcon
                                                size={16}
                                                weight="bold"
                                            />
                                            Logout
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            :   <div className="flex justify-center items-center gap-2">
                    <motion.span
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 20,
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-surface text-sm font-semibold transition-colors duration-200 rounded-xl cursor-pointer shadow-sm hover:shadow-md"
                        onClick={handleSignIn}
                    >
                        Sign In
                    </motion.span>
                </div>
            }
        </div>
    );
}
