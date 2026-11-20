import { getGroupOverview } from "@/app/actions/operators";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { GroupOverviewView } from "@/components/operators/GroupOverviewView";
import { groupOverviewTrail } from "@/lib/operators/breadcrumbs";

/** Drift › Grupper: Operators only. Everyone else gets not found. */
export default async function GroupOverviewPage() {
  const overview = await getGroupOverview();

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar trail={groupOverviewTrail} />
      <GroupOverviewView overview={overview} />
    </div>
  );
}
