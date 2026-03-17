import { PrismaClient } from "../lib/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as unknown as {
    prisma: ReturnType<typeof makePrismaClient>;
};

function makePrismaClient() {
    return new PrismaClient({
        accelerateUrl: process.env.DATABASE_URL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).$extends(withAccelerate());
}

const prisma = globalForPrisma.prisma || makePrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
