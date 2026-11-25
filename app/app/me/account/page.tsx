import { getAccountDeletionPlan, getOwnName } from "@/app/actions/account";
import { AccountDeletionSection } from "@/components/account/AccountDeletionSection";
import { AccountNameSection } from "@/components/account/AccountNameSection";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";

export default async function AccountPage() {
  const [name, plan] = await Promise.all([getOwnName(), getAccountDeletionPlan()]);

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
      <AccountNameSection name={name} />
      <AccountDeletionSection {...plan} />
    </div>
  );
}
