-- CreateEnum
CREATE TYPE "FileConversionState" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "conversion_state" "FileConversionState",
ADD COLUMN     "converted_storage_path" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "files_converted_storage_path_key" ON "files"("converted_storage_path");
