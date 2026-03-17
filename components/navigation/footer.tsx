import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import React from "react";

function Footer() {
    return (
        <div className="mt-20 p-2 w-full flex justify-center items-center bg-white/80 rounded-xl ">
            <span className="flex text-sm">
                Read
                <Link
                    href={"/documents"}
                    className="flex text-primary font-semibold px-1"
                >
                    {" Document "}
                    <ArrowUpRightIcon />
                </Link>
                to know more about the project.
            </span>
        </div>
    );
}

export default Footer;
