-- AlterTable
ALTER TABLE "TraderProfile" ADD COLUMN     "importNotes" TEXT,
ADD COLUMN     "importRef" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TraderProfile_importRef_key" ON "TraderProfile"("importRef");

