-- DropForeignKey
ALTER TABLE "groups" DROP CONSTRAINT "groups_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "pieces" DROP CONSTRAINT "pieces_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "pieces" DROP CONSTRAINT "pieces_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "links" DROP CONSTRAINT "links_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "links" DROP CONSTRAINT "links_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "people" DROP CONSTRAINT "people_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "people" DROP CONSTRAINT "people_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_lists" DROP CONSTRAINT "set_lists_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_lists" DROP CONSTRAINT "set_lists_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_list_pieces" DROP CONSTRAINT "set_list_pieces_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_list_pieces" DROP CONSTRAINT "set_list_pieces_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "piece_notes" DROP CONSTRAINT "piece_notes_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "piece_notes" DROP CONSTRAINT "piece_notes_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_list_piece_notes" DROP CONSTRAINT "set_list_piece_notes_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_list_piece_notes" DROP CONSTRAINT "set_list_piece_notes_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_list_notes" DROP CONSTRAINT "set_list_notes_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "set_list_notes" DROP CONSTRAINT "set_list_notes_updated_by_id_fkey";

-- AlterTable
ALTER TABLE "groups" ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pieces" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "links" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "files" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "people" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "set_lists" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "set_list_pieces" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "piece_notes" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "set_list_piece_notes" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "set_list_notes" ALTER COLUMN "created_by_id" DROP NOT NULL,
ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_lists" ADD CONSTRAINT "set_lists_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_lists" ADD CONSTRAINT "set_lists_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_pieces" ADD CONSTRAINT "set_list_pieces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_pieces" ADD CONSTRAINT "set_list_pieces_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_notes" ADD CONSTRAINT "piece_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_notes" ADD CONSTRAINT "piece_notes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_piece_notes" ADD CONSTRAINT "set_list_piece_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_piece_notes" ADD CONSTRAINT "set_list_piece_notes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_notes" ADD CONSTRAINT "set_list_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_notes" ADD CONSTRAINT "set_list_notes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

