import { stripe } from "@/lib/stripe";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CheckoutResultsPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>;
}) {
    const { session_id } = await searchParams;

    if (!session_id) {
        return redirect("/cart");
    }

    let paid = false;
    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        paid = session.status === "complete" && session.payment_status === "paid";
    } catch {
        return redirect("/cart");
    }

    // Fulfillment itself is handled by the /api/webhooks/stripe endpoint;
    // this page only shows the outcome of the payment.

    return (
        <div className="py-16 text-center animate-fade-in-up">
            {paid ? (
                <>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
                        <span className="text-4xl">&#10003;</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-3">
                        Purchase Complete!
                    </h1>
                    <p className="text-lg text-muted max-w-md mx-auto mb-8">
                        Thank you for your purchase. Your digital products are now
                        available for download.
                    </p>
                    <Link
                        href="/orders"
                        className="inline-block rounded-xl bg-primary/90 hover:bg-primary px-6 py-3 font-bold text-sm text-surface transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                        Go to Orders
                    </Link>
                </>
            ) : (
                <>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center">
                        <span className="text-4xl">&#10007;</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-3">
                        Payment Failed
                    </h1>
                    <p className="text-lg text-muted max-w-md mx-auto mb-8">
                        Something went wrong with your payment. Please try again.
                    </p>
                    <Link
                        href="/cart"
                        className="inline-block rounded-xl bg-primary/90 hover:bg-primary px-6 py-3 font-bold text-sm text-surface transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                        Return to Cart
                    </Link>
                </>
            )}
        </div>
    );
}
