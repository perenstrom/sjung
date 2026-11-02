-- CreateEnum
CREATE TYPE "group_claim" AS ENUM ('MANAGE_MEMBERS', 'MANAGE_CONTENT');

-- CreateTable
CREATE TABLE "group_member_claims" (
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "claim" "group_claim" NOT NULL,

    CONSTRAINT "group_member_claims_pkey" PRIMARY KEY ("user_id","group_id","claim")
);

-- AddForeignKey
ALTER TABLE "group_member_claims" ADD CONSTRAINT "group_member_claims_user_id_group_id_fkey" FOREIGN KEY ("user_id", "group_id") REFERENCES "users_to_groups"("user_id", "group_id") ON DELETE CASCADE ON UPDATE CASCADE;
