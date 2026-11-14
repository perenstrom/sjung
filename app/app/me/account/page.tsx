import { getAccountDeletionPlan } from "@/app/actions/account";
import { AccountDeletionSection } from "@/components/account/AccountDeletionSection";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";

export default async function AccountPage() {
  const plan = await getAccountDeletionPlan();

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
      <AccountDeletionSection {...plan} />
    </div>
  );
}
