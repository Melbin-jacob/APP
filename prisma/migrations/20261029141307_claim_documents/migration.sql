-- CreateEnum
CREATE TYPE "ClaimDocumentKind" AS ENUM ('REGISTRATION', 'ID_PROOF');

-- AlterTable
ALTER TABLE "ListingClaim" ADD COLUMN     "documentsChecked" TEXT,
ADD COLUMN     "documentsDeletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClaimDocument" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "kind" "ClaimDocumentKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sealed" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClaimDocument_claimId_kind_key" ON "ClaimDocument"("claimId", "kind");

-- AddForeignKey
ALTER TABLE "ClaimDocument" ADD CONSTRAINT "ClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ListingClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
