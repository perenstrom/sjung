"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteOwnAccount } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreatorGroup, CreatorGroups } from "@/lib/account/account-deletion";

/** Where a Creator deletes a Group: the row menu on My groups. */
const DELETE_GROUP_HREF = "/app/me/groups";

/**
 * "Ta bort konto" on the account page: says what Account deletion does, and
 * deletes once the User re-enters their password. Disabled while they are
 * Creator of a Group with other Members; the action refuses that case too.
 */
export function AccountDeletionSection({ soloGroups, sharedGroups }: CreatorGroups) {
  const [state, formAction, isPending] = useActionState(deleteOwnAccount, null);
  const isBlocked = sharedGroups.length > 0;

  return (
    <section className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Ta bort konto</h2>
      <p className="text-sm text-muted-foreground">
        Ditt konto och dina personuppgifter tas bort permanent. Det går inte att ångra. Det du har
        lagt till ligger kvar i grupperna, men visas inte längre som ditt.
      </p>

      {soloGroups.length > 0 ? (
        <GroupList
          intro="Du är ensam medlem i de här grupperna, så de tas bort tillsammans med kontot, med alla noter och filer:"
          groups={soloGroups}
        />
      ) : null}

      {isBlocked ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm">
          <GroupList
            intro="Du är administratör för grupper som har andra medlemmar. Administratör går inte att lämna över än, så du behöver ta bort de här grupperna innan du kan ta bort kontot:"
            groups={sharedGroups}
            linkTo={DELETE_GROUP_HREF}
          />
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        {state?.error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="delete-account-password">Bekräfta med ditt lösenord</Label>
          <Input
            id="delete-account-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isBlocked}
          />
        </div>

        <Button type="submit" variant="destructive" disabled={isBlocked || isPending}>
          Ta bort konto
        </Button>
      </form>
    </section>
  );
}

function GroupList({
  intro,
  groups,
  linkTo,
}: {
  intro: string;
  groups: CreatorGroup[];
  linkTo?: string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <p>{intro}</p>
      <ul className="list-disc space-y-1 pl-5">
        {groups.map((group) => (
          <li key={group.id}>
            {linkTo ? (
              <Link href={linkTo} className="font-medium underline underline-offset-4">
                {group.name}
              </Link>
            ) : (
              <span className="font-medium">{group.name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
