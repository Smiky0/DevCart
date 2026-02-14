"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ImageCarouselProps {
    images: string[];
    alt: string;
}

export default function ImageCarousel({ images, alt }: ImageCarouselProps) {
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState(0);

    const hasMultiple = images.length > 1;

    const goTo = (index: number) => {
        setDirection(index > current ? 1 : -1);
        setCurrent(index);
    };

    const prev = () => {
        setDirection(-1);
        setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
    };

    const next = () => {
        setDirection(1);
        setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));
    };

    const variants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 80 : -80,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (dir: number) => ({
            x: dir > 0 ? -80 : 80,
            opacity: 0,
        }),
    };

    return (
        <div className="relative group">
            {/* Main image */}
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-surface-alt border border-border/60 shadow-lg shadow-foreground/15">
                <AnimatePresence
                    initial={false}
                    custom={direction}
                    mode="popLayout"
                >
                    <motion.div
                        key={current}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0"
                    >
                        <Image
                            src={images[current]}
                            alt={`${alt} - Image ${current + 1}`}
                            width={1080}
                            height={810}
                            unoptimized
                            className="h-full w-full object-cover"
                        />
                    </motion.div>
                </AnimatePresence>

                {/* Navigation arrows */}
                {hasMultiple && (
                    <>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                prev();
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-black/60"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                next();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-black/60"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </>
                )}

                {/* Counter badge */}
                {hasMultiple && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-medium">
                        {current + 1} / {images.length}
                    </div>
                )}
            </div>

            {/* Thumbnail strip */}
            {hasMultiple && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.preventDefault();
                                goTo(i);
                            }}
                            className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                                i === current ?
                                    "border-primary shadow-sm"
                                :   "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                            <Image
                                src={img}
                                alt={`Thumbnail ${i + 1}`}
                                width={64}
                                height={48}
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
