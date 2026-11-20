"use server";

import { listGroupOverview, type GroupOverview } from "@/lib/operators/group-overview";
import { requireOperatorPage } from "@/lib/operators/require-operator";

/** Drift › Grupper: every Group's size and activity. Not found for anyone but an Operator. */
export async function getGroupOverview(): Promise<GroupOverview> {
  await requireOperatorPage();
  return listGroupOverview();
}
