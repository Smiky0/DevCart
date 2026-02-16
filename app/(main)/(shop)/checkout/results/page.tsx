import React from "react";

function page() {
    return (
        <div className="py-16 text-center animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
                <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">
                Purchase Complete!
            </h1>
            <p className="text-lg text-muted max-w-md mx-auto">
                Thank you for your purchase. Your digital products are now
                available for download.
            </p>
        </div>
    );
}

export default page;
