-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('SUBJECT', 'LANGUAGE', 'CURRICULUM', 'HERITAGE', 'TCK_MARKER', 'INTEREST');

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "type" "TagType" NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorTag" (
    "mentorId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "MentorTag_pkey" PRIMARY KEY ("mentorId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_type_label_key" ON "Tag"("type", "label");

-- AddForeignKey
ALTER TABLE "MentorTag" ADD CONSTRAINT "MentorTag_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorTag" ADD CONSTRAINT "MentorTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
