import type { AppBreadcrumbStaticTrail } from "@/lib/breadcrumbs";
import { OPERATOR_PATH } from "@/lib/operators/routes";

/** Drift › Grupper. */
export const groupOverviewTrail: AppBreadcrumbStaticTrail = {
  visibility: "visible",
  ancestors: [{ label: "Drift", href: OPERATOR_PATH }],
  tail: { kind: "static", label: "Grupper" },
};
