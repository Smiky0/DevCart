import Navbar from "@/components/navigation/Navbar";
import ToastProvider from "@/components/ToastProvider";

// main is added in order to seperate auth page from rest of the webapp
export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <ToastProvider />
        </>
    );
}
