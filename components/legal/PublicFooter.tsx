import Link from "next/link";
import { PRIVACY_POLICY_PATH, TERMS_OF_USE_PATH } from "@/lib/legal/routes";

/** The small footer beneath every page outside `/app`, linking the Privacy policy and Terms of use. */
export function PublicFooter() {
  return (
    <footer className="flex justify-center gap-4 px-4 py-6 text-xs text-muted-foreground">
      <Link href={PRIVACY_POLICY_PATH} className="hover:underline">
        Integritetspolicy
      </Link>
      <Link href={TERMS_OF_USE_PATH} className="hover:underline">
        Användarvillkor
      </Link>
    </footer>
  );
}
