-- CreateEnum
CREATE TYPE "EmailScope" AS ENUM ('REVIEW_REQUESTS', 'NEWSLETTER');

-- CreateTable
CREATE TABLE "EmailOptOut" (
    "email" CITEXT NOT NULL,
    "scope" "EmailScope" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOptOut_pkey" PRIMARY KEY ("email","scope")
);
