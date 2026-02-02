"use client"; // This must be a client component to handle clicks
import Link from "next/link";

export function BuyButton({ price }: { price: number }) {
    const handleBuy = () => {
        console.log(price);
    };
    return (
        <Link href={"/checkout"}>
            <button
                onClick={handleBuy}
                className="w-full rounded-2xl border-2 border-black/40 px-4 py-2 bg-green-300 font-bold text-base cursor-pointer"
            >
                Buy Now for ${price.toFixed(2)}
            </button>
        </Link>
    );
}