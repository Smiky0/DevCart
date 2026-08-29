/*
  Warnings:

  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Product_updatedAt_id_idx" ON "Product"("updatedAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Product_category_updatedAt_id_idx" ON "Product"("category", "updatedAt" DESC, "id" DESC);
