-- Add nullable columns first to backfill existing rows safely.
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

-- Backfill legacy users with deterministic placeholders.
UPDATE "users"
SET
  "email" = COALESCE("email", CONCAT('legacy-', "id"::text, '@local.invalid')),
  "password_hash" = COALESCE(
    "password_hash",
    '$argon2id$v=19$m=65536,t=3,p=4$GV5rn+kERfq4H4as1PMQfw$T4cA7P8kwKhLn3ljPlaxu4tCgOKgiKjihu4RIdJoLS4'
  );

-- Enforce required fields and uniqueness for authenticated users.
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
