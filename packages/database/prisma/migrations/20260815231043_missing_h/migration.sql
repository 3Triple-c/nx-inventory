/*
  Warnings:

  - A unique constraint covering the columns `[businessId,adjustmentNumber]` on the table `Adjustment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Adjustment_adjustmentNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Adjustment_businessId_adjustmentNumber_key" ON "Adjustment"("businessId", "adjustmentNumber");
