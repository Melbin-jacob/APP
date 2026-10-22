-- AlterTable
ALTER TABLE "TraderProfile" ALTER COLUMN "currency" SET DEFAULT 'USD',
ALTER COLUMN "country" SET DEFAULT 'US';

-- CreateIndex
CREATE INDEX "TraderProfile_country_status_ratingAvg_idx" ON "TraderProfile"("country", "status", "ratingAvg" DESC);
