import { redirect } from "next/navigation";
import { OPERATOR_GROUPS_PATH } from "@/lib/operators/routes";
import { requireOperatorPage } from "@/lib/operators/require-operator";

/** Drift has no page of its own: it opens on the Group overview. Not found for anyone but an Operator. */
export default async function OperatorPage() {
  await requireOperatorPage();
  redirect(OPERATOR_GROUPS_PATH);
}
