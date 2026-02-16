import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
// import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import prisma from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [GitHub, Google],
    // pages: { signIn: "/signin" },
    callbacks: {
        async session({ session }) {
            if (session.user) {
                session.user.id = session.userId;
            }
            return session;
        },
    },
});
