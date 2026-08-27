-- AlterTable
ALTER TABLE "PriceAlert" ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifiedPrice" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "PriceAlert_active_notifiedAt_idx" ON "PriceAlert"("active", "notifiedAt");
