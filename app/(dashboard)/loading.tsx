export default function DashboardLoading() {
    return (
        <div className="py-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="skeleton h-9 w-56 mb-2"></div>
                    <div className="skeleton h-5 w-72"></div>
                </div>
                <div className="skeleton h-10 w-36 rounded-xl"></div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-border/60 bg-white p-6"
                    >
                        <div className="skeleton h-4 w-24 mb-3"></div>
                        <div className="skeleton h-8 w-20"></div>
                    </div>
                ))}
            </div>

            {/* Table header skeleton */}
            <div className="skeleton h-6 w-40 mb-4"></div>

            {/* Table rows skeleton */}
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-border/60 bg-white p-4 grid grid-cols-12 gap-4 items-center"
                    >
                        <div className="col-span-4 flex items-center gap-3">
                            <div className="skeleton h-12 w-12 rounded-xl shrink-0"></div>
                            <div className="skeleton h-4 w-32"></div>
                        </div>
                        <div className="col-span-3">
                            <div className="skeleton h-4 w-20"></div>
                        </div>
                        <div className="col-span-2">
                            <div className="skeleton h-4 w-16"></div>
                        </div>
                        <div className="col-span-2">
                            <div className="skeleton h-4 w-12"></div>
                        </div>
                        <div className="col-span-1">
                            <div className="skeleton h-8 w-8 rounded-lg"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
