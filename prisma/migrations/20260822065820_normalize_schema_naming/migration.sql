-- Rename typo'd columns in place (preserves all data)
ALTER TABLE "User" RENAME COLUMN "CreatedAt" TO "createdAt";

-- Orphan carts have no owner and are unreachable in the app
DELETE FROM "Cart" WHERE "userId" IS NULL;

ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";
ALTER TABLE "Cart" RENAME COLUMN "updateAt" TO "updatedAt";
ALTER TABLE "Cart" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
