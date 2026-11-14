import Link from "next/link";
import { TERMS_OF_USE_PATH } from "@/lib/legal/routes";

/** Shown in every file picker: Files may only be uploaded by someone with the right to store them. */
export function FileRightsReminder() {
  return (
    <p className="text-xs text-muted-foreground">
      Ladda bara upp filer du har rätt att lagra digitalt. Läs{" "}
      <Link href={TERMS_OF_USE_PATH} className="underline" target="_blank" rel="noopener">
        användarvillkoren
      </Link>
      .
    </p>
  );
}
