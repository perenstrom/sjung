-- Rename core sheet music table to pieces.
ALTER TABLE "sheet_music" RENAME TO "pieces";

-- Rename join table and FK columns.
ALTER TABLE "people_to_sheet_music" RENAME TO "people_to_pieces";
ALTER TABLE "files" RENAME COLUMN "sheet_music_id" TO "piece_id";
ALTER TABLE "people_to_pieces" RENAME COLUMN "sheet_music_id" TO "piece_id";

-- Keep constraint names aligned with new domain terminology.
ALTER TABLE "pieces" RENAME CONSTRAINT "sheet_music_pkey" TO "pieces_pkey";
ALTER TABLE "pieces" RENAME CONSTRAINT "sheet_music_created_by_id_fkey" TO "pieces_created_by_id_fkey";
ALTER TABLE "pieces" RENAME CONSTRAINT "sheet_music_updated_by_id_fkey" TO "pieces_updated_by_id_fkey";
ALTER TABLE "pieces" RENAME CONSTRAINT "sheet_music_group_id_fkey" TO "pieces_group_id_fkey";

ALTER TABLE "files" RENAME CONSTRAINT "files_sheet_music_id_fkey" TO "files_piece_id_fkey";
ALTER TABLE "people_to_pieces" RENAME CONSTRAINT "people_to_sheet_music_pkey" TO "people_to_pieces_pkey";
ALTER TABLE "people_to_pieces" RENAME CONSTRAINT "people_to_sheet_music_person_id_fkey" TO "people_to_pieces_person_id_fkey";
ALTER TABLE "people_to_pieces" RENAME CONSTRAINT "people_to_sheet_music_sheet_music_id_fkey" TO "people_to_pieces_piece_id_fkey";
