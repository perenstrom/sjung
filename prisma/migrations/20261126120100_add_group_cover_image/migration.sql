-- AlterTable: the Cover image, and one "last changed" for Home's own content
-- now that it covers the Cover image as well as the description.
ALTER TABLE "groups" RENAME COLUMN "description_updated_at" TO "home_updated_at";
ALTER TABLE "groups" ADD COLUMN "cover_image_key" TEXT,
ADD COLUMN "cover_image_content_type" TEXT;
