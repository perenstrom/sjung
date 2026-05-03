-- CreateTable
CREATE TABLE "piece_notes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "piece_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "piece_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "piece_notes_group_id_piece_id_idx" ON "piece_notes"("group_id", "piece_id");

-- AddForeignKey
ALTER TABLE "piece_notes" ADD CONSTRAINT "piece_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_notes" ADD CONSTRAINT "piece_notes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_notes" ADD CONSTRAINT "piece_notes_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piece_notes" ADD CONSTRAINT "piece_notes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
