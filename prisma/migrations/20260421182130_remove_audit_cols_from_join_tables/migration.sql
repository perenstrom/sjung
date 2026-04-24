/*
  Warnings:

  - The primary key for the `people_to_sheet_music` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `people_to_sheet_music` table. All the data in the column will be lost.
  - You are about to drop the column `created_by_id` on the `people_to_sheet_music` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `people_to_sheet_music` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `people_to_sheet_music` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by_id` on the `people_to_sheet_music` table. All the data in the column will be lost.
  - The primary key for the `users_to_groups` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `users_to_groups` table. All the data in the column will be lost.
  - You are about to drop the column `created_by_id` on the `users_to_groups` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `users_to_groups` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users_to_groups` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by_id` on the `users_to_groups` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "people_to_sheet_music" DROP CONSTRAINT "people_to_sheet_music_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "people_to_sheet_music" DROP CONSTRAINT "people_to_sheet_music_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "users_to_groups" DROP CONSTRAINT "users_to_groups_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "users_to_groups" DROP CONSTRAINT "users_to_groups_updated_by_id_fkey";

-- DropIndex
DROP INDEX "people_to_sheet_music_person_id_sheet_music_id_role_key";

-- DropIndex
DROP INDEX "users_to_groups_user_id_group_id_key";

-- AlterTable
ALTER TABLE "people_to_sheet_music" DROP CONSTRAINT "people_to_sheet_music_pkey",
DROP COLUMN "created_at",
DROP COLUMN "created_by_id",
DROP COLUMN "id",
DROP COLUMN "updated_at",
DROP COLUMN "updated_by_id",
ADD CONSTRAINT "people_to_sheet_music_pkey" PRIMARY KEY ("person_id", "sheet_music_id", "role");

-- AlterTable
ALTER TABLE "users_to_groups" DROP CONSTRAINT "users_to_groups_pkey",
DROP COLUMN "created_at",
DROP COLUMN "created_by_id",
DROP COLUMN "id",
DROP COLUMN "updated_at",
DROP COLUMN "updated_by_id",
ADD CONSTRAINT "users_to_groups_pkey" PRIMARY KEY ("user_id", "group_id");
