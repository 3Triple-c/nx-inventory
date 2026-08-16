/*
  Warnings:

  - A unique constraint covering the columns `[businessId,transferNumber]` on the table `Transfer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Transfer_transferNumber_key";

-- AlterTable
ALTER TABLE "AdjustmentItem" ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_businessId_transferNumber_key" ON "Transfer"("businessId", "transferNumber");
