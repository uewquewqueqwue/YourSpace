-- CreateEnum
CREATE TYPE "Category" AS ENUM ('feature', 'improvement', 'bugfix', 'performance', 'security', 'other');

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minVersion" TEXT,
    "downloadUrl" TEXT,
    "size" INTEGER,
    "changelog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatchNote" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "Category" NOT NULL DEFAULT 'feature',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatchNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppVersion_version_key" ON "AppVersion"("version");

-- AddForeignKey
ALTER TABLE "PatchNote" ADD CONSTRAINT "PatchNote_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AppVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
