-- DropForeignKey
ALTER TABLE "people_to_pieces" DROP CONSTRAINT "people_to_pieces_person_id_fkey";

-- AddForeignKey
ALTER TABLE "people_to_pieces" ADD CONSTRAINT "people_to_pieces_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
