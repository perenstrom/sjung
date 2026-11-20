import prisma from "@/lib/prisma";

/** The Group's People by name, for pickers. */
export async function getPeopleForGroup(groupId: string) {
  return prisma.person.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
  });
}
