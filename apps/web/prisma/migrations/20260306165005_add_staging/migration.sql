-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NEW', 'REVIEWING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "RawSource" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT,
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagedMentor" (
    "id" TEXT NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "rawJson" JSONB NOT NULL,
    "sourceId" TEXT NOT NULL,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StagedMentor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawSource_url_key" ON "RawSource"("url");

-- CreateIndex
CREATE UNIQUE INDEX "StagedMentor_fingerprint_key" ON "StagedMentor"("fingerprint");

-- CreateIndex
CREATE INDEX "StagedMentor_status_idx" ON "StagedMentor"("status");

-- CreateIndex
CREATE INDEX "StagedMentor_sourceId_idx" ON "StagedMentor"("sourceId");

-- AddForeignKey
ALTER TABLE "StagedMentor" ADD CONSTRAINT "StagedMentor_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RawSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
