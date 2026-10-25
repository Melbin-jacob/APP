-- CreateTable
CREATE TABLE "DailyVisitorStat" (
    "day" DATE NOT NULL,
    "visitors" INTEGER NOT NULL,
    "pageViews" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyVisitorStat_pkey" PRIMARY KEY ("day")
);

