"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LandingHero() {
    const router = useRouter();

    const handleStartBrowsing = () => {
        const element = document.getElementById("products-section");
        element?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSellAssets = () => {
        router.push("/studio");
    };

    return (
        <section className="relative px-6 py-12 md:py-24 max-w-7xl mx-auto overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <div className="z-10">
                    <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase tracking-widest">
                        Digital Marketplace V1.1
                    </span>
                    <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter text-foreground mb-6 leading-none">
                        Discover <span className="text-primary italic">Digital</span>{" "}
                        Products
                    </h1>
                    <p className="text-lg md:text-xl text-muted mb-10 max-w-lg leading-relaxed">
                        Premium templates, tools, and assets — download instantly and
                        build something amazing. Curated by experts for professional
                        creators.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleStartBrowsing}
                            className="bg-primary text-white px-8 py-4 rounded-full font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-95 active:shadow-sm transition-all duration-200 ease-out cursor-pointer"
                        >
                            Start Browsing
                        </button>
                        <button
                            onClick={handleSellAssets}
                            className="bg-transparent text-surface-foreground px-8 py-4 rounded-full font-bold border border-surface-foreground/20 hover:bg-surface-alt hover:border-surface-foreground/30 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
                        >
                            Sell Assets
                        </button>
                    </div>
                </div>

                {/* Right - Product img Grid */}
                <div className="relative hidden lg:block">
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-surface/5 rounded-full blur-3xl"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4 pt-12">
                            <div className="aspect-3/4 rounded-2xl overflow-hidden bg-surface-container shadow-2xl transition-transform hover:-translate-y-2 duration-500">
                                <Image
                                    width={1000}
                                    height={1000}
                                    className="w-full h-full object-cover"
                                    src="/hero.webp"
                                    alt="Abstract 3D UI kit preview"
                                />
                            </div>
                            <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container shadow-2xl transition-transform hover:-translate-y-2 duration-500">
                                <Image
                                    width={1000}
                                    height={1000}
                                    className="w-full h-full object-cover"
                                    src="/hero3.webp"
                                    alt="Dashboard interface design"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="aspect-square rounded-2xl overflow-hidden bg-surface-container shadow-2xl transition-transform hover:-translate-y-2 duration-500">
                                <Image
                                    width={1000}
                                    height={1000}
                                    className="w-full h-full object-cover"
                                    src="/hero2.webp"
                                    alt="Dashboard interface design"
                                />
                            </div>
                            <div className="aspect-3/4 rounded-2xl overflow-hidden bg-surface-container shadow-2xl transition-transform hover:-translate-y-2 duration-500">
                                <Image
                                    width={1000}
                                    height={1000}
                                    className="w-full h-full object-cover"
                                    src="/hero1.webp"
                                    alt="Abstract 3D UI kit preview"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
