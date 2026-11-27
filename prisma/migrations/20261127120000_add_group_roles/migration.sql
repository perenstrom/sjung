-- CreateTable
CREATE TABLE "group_roles" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,

    CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_role_claims" (
    "role_id" TEXT NOT NULL,
    "claim" "group_claim" NOT NULL,

    CONSTRAINT "group_role_claims_pkey" PRIMARY KEY ("role_id","claim")
);

-- CreateTable
CREATE TABLE "group_member_roles" (
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "group_member_roles_pkey" PRIMARY KEY ("user_id","group_id","role_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_roles_group_id_name_key_key" ON "group_roles"("group_id", "name_key");

-- CreateIndex
CREATE UNIQUE INDEX "group_roles_id_group_id_key" ON "group_roles"("id", "group_id");

-- CreateIndex
CREATE INDEX "group_member_roles_role_id_idx" ON "group_member_roles"("role_id");

-- AddForeignKey
ALTER TABLE "group_roles" ADD CONSTRAINT "group_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_role_claims" ADD CONSTRAINT "group_role_claims_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "group_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member_roles" ADD CONSTRAINT "group_member_roles_user_id_group_id_fkey" FOREIGN KEY ("user_id", "group_id") REFERENCES "users_to_groups"("user_id", "group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member_roles" ADD CONSTRAINT "group_member_roles_role_id_group_id_fkey" FOREIGN KEY ("role_id", "group_id") REFERENCES "group_roles"("id", "group_id") ON DELETE CASCADE ON UPDATE CASCADE;

