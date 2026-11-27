-- Group links: a Group's standing places outside Sjung, listed on Home.
-- CreateTable
CREATE TABLE "group_links" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "group_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_links_group_id_idx" ON "group_links"("group_id");

-- AddForeignKey
ALTER TABLE "group_links" ADD CONSTRAINT "group_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_links" ADD CONSTRAINT "group_links_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_links" ADD CONSTRAINT "group_links_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

