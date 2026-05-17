-- CreateTable
CREATE TABLE "set_list_notes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "set_list_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "set_list_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "set_list_notes" ADD CONSTRAINT "set_list_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_notes" ADD CONSTRAINT "set_list_notes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_list_notes" ADD CONSTRAINT "set_list_notes_set_list_id_fkey" FOREIGN KEY ("set_list_id") REFERENCES "set_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill set_list_pieces.position per set_list_id (created_at ASC, starting at 1)
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY set_list_id ORDER BY created_at ASC) AS rn
    FROM "set_list_pieces"
)
UPDATE "set_list_pieces" AS slp
SET "position" = ranked.rn
FROM ranked
WHERE slp.id = ranked.id
  AND slp."position" IS NULL;

-- AlterTable
ALTER TABLE "set_list_pieces" ALTER COLUMN "position" SET NOT NULL;
