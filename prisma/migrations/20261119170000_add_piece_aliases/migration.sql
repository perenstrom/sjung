-- CreateTable
CREATE TABLE "piece_aliases" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "piece_id" TEXT NOT NULL,

    CONSTRAINT "piece_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "piece_aliases_piece_id_created_at_idx" ON "piece_aliases"("piece_id", "created_at");

-- AddForeignKey
ALTER TABLE "piece_aliases" ADD CONSTRAINT "piece_aliases_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
