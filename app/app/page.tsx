import Link from "next/link";
import { redirect } from "next/navigation";
import { getGroups } from "@/app/actions/groups";
import { requireUser } from "@/lib/auth/require-user";

export default async function AppHubPage() {
  await requireUser();
  const groups = await getGroups();

  if (groups.length === 0) {
    redirect("/app/me/groups");
  }

  if (groups.length === 1) {
    redirect(`/app/${groups[0].slug}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Välj grupp</h1>
      <p className="text-muted-foreground">
        Du tillhör flera grupper. Välj vilken du vill arbeta i.
      </p>
      <ul className="space-y-2">
        {groups.map((g) => (
          <li key={g.id}>
            <Link
              href={`/app/${g.slug}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {g.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
