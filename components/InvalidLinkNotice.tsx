import Link from "next/link";
import { Button } from "@/components/ui/button";

/** "Länken fungerar inte": an emailed link that can't be used, and where to get a new one. */
export function InvalidLinkNotice({ message, newLinkHref }: { message: string; newLinkHref: string }) {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Länken fungerar inte</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button asChild className="w-full">
        <Link href={newLinkHref}>Skicka en ny länk</Link>
      </Button>
    </>
  );
}
