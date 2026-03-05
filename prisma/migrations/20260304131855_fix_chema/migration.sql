-- DropIndex
DROP INDEX "UserApp_userId_catalogId_key";

-- AlterTable
ALTER TABLE "AppCatalog" ADD COLUMN     "displayName" TEXT;
