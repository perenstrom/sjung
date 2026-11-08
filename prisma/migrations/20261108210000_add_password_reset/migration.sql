-- AlterEnum
ALTER TYPE "user_token_purpose" ADD VALUE 'PASSWORD_RESET';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0;
