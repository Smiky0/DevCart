import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navigation/Navbar";
import { SessionProvider } from "next-auth/react";
import ToastProvider from "@/components/ToastProvider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "DevCart — Digital Marketplace",
    description: "Discover and sell digital products on DevCart",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SessionProvider>
            <html lang="en">
                <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
                >
                    <Navbar />
                    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 animate-fade-in-up">
                        {children}
                    </main>
                    <ToastProvider />
                </body>
            </html>
        </SessionProvider>
    );
}
