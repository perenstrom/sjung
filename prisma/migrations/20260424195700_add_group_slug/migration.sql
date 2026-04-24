-- AlterTable
ALTER TABLE "groups" ADD COLUMN "slug" TEXT;

-- Deterministic slug for seeded default group; any other row without slug uses id-based fallback.
UPDATE "groups" SET "slug" = 'standardgrupp' WHERE "id" = '00000000-0000-0000-0000-000000000002' AND "slug" IS NULL;

UPDATE "groups" SET "slug" = LOWER(REPLACE("id"::text, '-', '')) WHERE "slug" IS NULL;

ALTER TABLE "groups" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "groups_slug_key" ON "groups"("slug");
