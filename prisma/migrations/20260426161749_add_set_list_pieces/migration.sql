-- CreateTable
CREATE TABLE "set_list_pieces" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "set_list_id" TEXT NOT NULL,
    "piece_id" TEXT NOT NULL,
    "position" INTEGER,

    CONSTRAINT "set_list_pieces_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "set_list_pieces" ADD CONSTRAINT "set_list_pieces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_pieces" ADD CONSTRAINT "set_list_pieces_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_pieces" ADD CONSTRAINT "set_list_pieces_set_list_id_fkey" FOREIGN KEY ("set_list_id") REFERENCES "set_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_pieces" ADD CONSTRAINT "set_list_pieces_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
