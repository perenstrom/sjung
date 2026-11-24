-- Content Slugs (PER-481, ADR-0011). The columns are added empty, filled in
-- for existing rows, then made required. Within a clash the oldest row (by
-- created_at) keeps the plain Slug and later ones get -2, -3, ... as the app
-- does. The SQL slugify approximates the app's (lib/slug.ts); a backfilled
-- Slug only has to be URL-safe and unique, and is made again on the next rename.

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN "slug" TEXT;
ALTER TABLE "files" ADD COLUMN "slug" TEXT;
ALTER TABLE "people" ADD COLUMN "slug" TEXT;
ALTER TABLE "pieces" ADD COLUMN "slug" TEXT;
ALTER TABLE "set_lists" ADD COLUMN "slug" TEXT;

CREATE FUNCTION "sjung_slugify"(raw TEXT, fallback TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(
      trim(BOTH '-' FROM regexp_replace(
        translate(
          replace(replace(replace(replace(replace(lower(raw), 'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), 'ü', 'ue'), '&', ' and '),
          'åäöáàâãéèêëíìîïóòôõúùûýÿñçø',
          'aaoaaaaeeeeiiiioooouuuyynco'
        ),
        '[^a-z0-9]+', '-', 'g'
      )),
      ''
    ),
    fallback
  )
$$;

DO $$
DECLARE
  r RECORD;
  base TEXT;
  candidate TEXT;
  n INT;
BEGIN
  FOR r IN SELECT "id", "group_id", "name" FROM "pieces" ORDER BY "created_at", "id" LOOP
    base := "sjung_slugify"(r."name", 'stycke');
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM "pieces" WHERE "group_id" = r."group_id" AND "slug" = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE "pieces" SET "slug" = candidate WHERE "id" = r."id";
  END LOOP;

  FOR r IN SELECT "id", "group_id", "name" FROM "set_lists" ORDER BY "created_at", "id" LOOP
    base := "sjung_slugify"(r."name", 'repertoar');
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM "set_lists" WHERE "group_id" = r."group_id" AND "slug" = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE "set_lists" SET "slug" = candidate WHERE "id" = r."id";
  END LOOP;

  FOR r IN SELECT "id", "group_id", "name" FROM "people" ORDER BY "created_at", "id" LOOP
    base := "sjung_slugify"(r."name", 'person');
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM "people" WHERE "group_id" = r."group_id" AND "slug" = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE "people" SET "slug" = candidate WHERE "id" = r."id";
  END LOOP;

  FOR r IN
    SELECT f."id", p."group_id", f."display_name"
    FROM "files" f JOIN "pieces" p ON p."id" = f."piece_id"
    ORDER BY f."created_at", f."id"
  LOOP
    base := "sjung_slugify"(r."display_name", 'fil');
    candidate := base;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM "files" f JOIN "pieces" p ON p."id" = f."piece_id"
      WHERE p."group_id" = r."group_id" AND f."slug" = candidate
    ) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE "files" SET "slug" = candidate WHERE "id" = r."id";
  END LOOP;

  -- published_at is stored in UTC; the Slug's date is the day in Stockholm.
  FOR r IN SELECT "id", "title", "published_at" FROM "announcements" ORDER BY "created_at", "id" LOOP
    base := to_char((r."published_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD')
      || '-' || "sjung_slugify"(r."title", 'nyhet');
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM "announcements" WHERE "slug" = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE "announcements" SET "slug" = candidate WHERE "id" = r."id";
  END LOOP;
END $$;

DROP FUNCTION "sjung_slugify"(TEXT, TEXT);

ALTER TABLE "announcements" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "files" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "people" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "pieces" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "set_lists" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "announcements_slug_key" ON "announcements"("slug");

-- CreateIndex
CREATE INDEX "files_piece_id_slug_idx" ON "files"("piece_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "people_group_id_slug_key" ON "people"("group_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "pieces_group_id_slug_key" ON "pieces"("group_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "set_lists_group_id_slug_key" ON "set_lists"("group_id", "slug");
