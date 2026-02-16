function loading() {
    return (
        <div className="py-6 animate-fade-in-up">
            <div className="skeleton h-10 w-48 mb-6"></div>
            <div className="skeleton h-20 w-full mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-80 w-full"></div>
                ))}
            </div>
        </div>
    );
}

export default loading;
