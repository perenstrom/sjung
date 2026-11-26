-- AlterEnum
ALTER TYPE "group_claim" ADD VALUE 'MANAGE_GROUP_DESCRIPTION';

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "description" TEXT,
ADD COLUMN     "description_updated_at" TIMESTAMP(3);
