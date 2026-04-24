import { redirect } from "next/navigation";

export default function MeIndexPage() {
  redirect("/app/me/groups");
}
