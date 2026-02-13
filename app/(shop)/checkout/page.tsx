"use server";

export default async function CheckoutPage() {
    return (
        <div className="py-6 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-foreground mb-8">
                Checkout
            </h1>
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white border border-border/60 rounded-2xl p-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Order Summary
                    </h2>
                    <p className="text-muted">
                        Review your order details here.
                    </p>
                </div>
                <div className="w-full lg:w-80 bg-white border border-border/60 rounded-2xl p-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Payment
                    </h2>
                    <p className="text-muted">
                        Payment processing will appear here.
                    </p>
                </div>
            </div>
        </div>
    );
}
