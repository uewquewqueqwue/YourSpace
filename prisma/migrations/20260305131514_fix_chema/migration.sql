/*
  Warnings:

  - You are about to drop the `AppSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AppSession" DROP CONSTRAINT "AppSession_userAppId_fkey";

-- DropForeignKey
ALTER TABLE "AppSession" DROP CONSTRAINT "AppSession_userId_fkey";

-- AlterTable
ALTER TABLE "UserApp" ADD COLUMN     "customIcon" TEXT;

-- DropTable
DROP TABLE "AppSession";
