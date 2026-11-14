import { redirect } from "next/navigation";
import { MY_GROUPS_PATH } from "@/lib/groups/routes";

export default function MeIndexPage() {
  redirect(MY_GROUPS_PATH);
}
