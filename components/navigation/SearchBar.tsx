"use client";
import { useState } from "react";
import { Search } from "lucide-react";

function SearchBar() {
    const [searchValue, setSearchValue] = useState<string>("");
    return (
        <div className="gap-1 flex justify-center items-center w-full md:w-[30vw] rounded-4xl p-1 px-2 text-base bg-white/85 backdrop-blur-sm text-gray-800 tracking-wider border-none outline-none">
            <input
                className="w-full px-2 placeholder:text-gray-600 placeholder:italic placeholder:tracking-wide cursor-text border-none outline-none"
                type="text"
                name="search"
                placeholder={"Search product..."}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
            />
            <Search
                strokeWidth={2}
                color="black"
                size={34}
                className="p-1 cursor-pointer"
            />
        </div>
    );
}

export default SearchBar;
