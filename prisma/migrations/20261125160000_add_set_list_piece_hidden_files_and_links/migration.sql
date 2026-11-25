-- CreateTable
CREATE TABLE "set_list_piece_hidden_files" (
    "set_list_piece_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,

    CONSTRAINT "set_list_piece_hidden_files_pkey" PRIMARY KEY ("set_list_piece_id","file_id")
);

-- CreateTable
CREATE TABLE "set_list_piece_hidden_links" (
    "set_list_piece_id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,

    CONSTRAINT "set_list_piece_hidden_links_pkey" PRIMARY KEY ("set_list_piece_id","link_id")
);

-- CreateIndex
CREATE INDEX "set_list_piece_hidden_files_file_id_idx" ON "set_list_piece_hidden_files"("file_id");

-- CreateIndex
CREATE INDEX "set_list_piece_hidden_links_link_id_idx" ON "set_list_piece_hidden_links"("link_id");

-- AddForeignKey
ALTER TABLE "set_list_piece_hidden_files" ADD CONSTRAINT "set_list_piece_hidden_files_set_list_piece_id_fkey" FOREIGN KEY ("set_list_piece_id") REFERENCES "set_list_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_piece_hidden_files" ADD CONSTRAINT "set_list_piece_hidden_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_piece_hidden_links" ADD CONSTRAINT "set_list_piece_hidden_links_set_list_piece_id_fkey" FOREIGN KEY ("set_list_piece_id") REFERENCES "set_list_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_piece_hidden_links" ADD CONSTRAINT "set_list_piece_hidden_links_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
