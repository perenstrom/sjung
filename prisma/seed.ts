import "dotenv/config";
import { Pool } from "pg";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";
const SYSTEM_USER_EMAIL = "system@local.invalid";
const DEFAULT_GROUP_ID = "00000000-0000-0000-0000-000000000002";

async function main() {
  const passwordHash = await argon2.hash("change-me-system-password");
  const user = await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {
      email: SYSTEM_USER_EMAIL,
      passwordHash,
    },
    create: {
      id: SYSTEM_USER_ID,
      name: "Systemanvändare",
      email: SYSTEM_USER_EMAIL,
      passwordHash,
      createdById: null,
      updatedById: null,
    },
  });

  const group = await prisma.group.upsert({
    where: { id: DEFAULT_GROUP_ID },
    update: {
      slug: "standardgrupp",
    },
    create: {
      id: DEFAULT_GROUP_ID,
      name: "Standardgrupp",
      slug: "standardgrupp",
      createdById: SYSTEM_USER_ID,
      updatedById: SYSTEM_USER_ID,
    },
  });

  await prisma.usersToGroups.upsert({
    where: {
      userId_groupId: {
        userId: SYSTEM_USER_ID,
        groupId: DEFAULT_GROUP_ID,
      },
    },
    update: {},
    create: {
      userId: SYSTEM_USER_ID,
      groupId: DEFAULT_GROUP_ID,
    },
  });

  console.log(`Seeded user: ${user.name} (${user.id})`);
  console.log(`Seeded group: ${group.name} (${group.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
