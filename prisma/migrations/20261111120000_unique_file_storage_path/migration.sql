-- Two Files sharing one stored object would break each other on delete.
-- Fails if production already has duplicate storage_path values; resolve those first.

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_path_key" ON "files"("storage_path");
