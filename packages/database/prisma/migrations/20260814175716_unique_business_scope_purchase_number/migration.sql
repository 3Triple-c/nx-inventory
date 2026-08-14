/*
  Warnings:

  - A unique constraint covering the columns `[businessId,purchaseNumber]` on the table `Purchase` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Purchase_purchaseNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_businessId_purchaseNumber_key" ON "Purchase"("businessId", "purchaseNumber");
