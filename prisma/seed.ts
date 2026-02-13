import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const userId = "cmkz6mtrd000000cc89l3olus";

async function main() {
    // Products
    await prisma.product.createMany({
        data: [
            {
                id: "prod_1",
                sellerId: userId,
                title: "Nexus: Ultimate SaaS Starter Kit",
                description:
                    "Launch your startup in days. Includes Next.js 14, Stripe, and Auth.",
                price: 4900,
                isPublished: true,
                category: "Templates",
                images: [
                    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
                ],
            },
            {
                id: "prod_2",
                sellerId: userId,
                title: "Glassmorphism 3D Icon Pack",
                description:
                    "A set of 80 high-resolution 3D icons rendered in Blender.",
                price: 1500,
                isPublished: true,
                category: "Icons",
                images: [
                    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
                ],
            },
            {
                id: "prod_3",
                sellerId: userId,
                title: "Advanced Prisma Patterns",
                description:
                    "Deep dive into database schema design and optimizing SQL queries.",
                price: 2999,
                isPublished: true,
                category: "Education",
                images: [
                    "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80",
                ],
            },
        ],
    });

    // File Assets (Linked to products via ID)
    await prisma.fileAsset.createMany({
        data: [
            {
                productId: "prod_1",
                fileName: "nexus-starter.zip",
                fileSize: 45000000,
                storageKey: "protected/user_1/nexus.zip",
            },
            {
                productId: "prod_2",
                fileName: "3d-icons.zip",
                fileSize: 12000000,
                storageKey: "protected/user_1/icons.zip",
            },
            {
                productId: "prod_3",
                fileName: "prisma-guide.pdf",
                fileSize: 5000000,
                storageKey: "protected/user_2/prisma-guide.pdf",
            },
        ],
    });

    console.log("✅ Database seeded with fake products!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
