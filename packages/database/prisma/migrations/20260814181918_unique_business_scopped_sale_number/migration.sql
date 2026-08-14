/*
  Warnings:

  - A unique constraint covering the columns `[businessId,saleNumber]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Sale_saleNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Sale_businessId_saleNumber_key" ON "Sale"("businessId", "saleNumber");
