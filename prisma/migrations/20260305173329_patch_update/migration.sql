/*
  Warnings:

  - The `category` column on the `PatchNote` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PatchCategory" AS ENUM ('FEATURE', 'IMPROVEMENT', 'BUGFIX', 'PERFORMANCE', 'SECURITY', 'OTHER');

-- AlterTable
ALTER TABLE "PatchNote" DROP COLUMN "category",
ADD COLUMN     "category" "PatchCategory" NOT NULL DEFAULT 'FEATURE';

-- DropEnum
DROP TYPE "Category";
