import { getAccountDeletionPlan } from "@/app/actions/account";
import { AccountDeletionSection } from "@/components/account/AccountDeletionSection";
import { AccountNameSection } from "@/components/account/AccountNameSection";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { requireUser } from "@/lib/auth/require-user";

export default async function AccountPage() {
  const [user, plan] = await Promise.all([requireUser(), getAccountDeletionPlan()]);

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [],
          tail: { kind: "static", label: "Mitt konto" },
        }}
      />
      <h1 className="text-2xl font-semibold">Mitt konto</h1>
      <AccountNameSection name={user.name} />
      <AccountDeletionSection {...plan} />
    </div>
  );
}
