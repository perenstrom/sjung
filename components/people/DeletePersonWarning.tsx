import { DialogDescription } from "@/components/ui/dialog";

/**
 * What deleting a Person takes with it: nothing else when they have no
 * Credits, otherwise their Credits on each of these Pieces.
 */
export function DeletePersonWarning({
  personName,
  pieces,
}: {
  personName: string;
  /** Each Piece the Person is credited on, once. */
  pieces: readonly { pieceId: string; name: string }[];
}) {
  if (pieces.length === 0) {
    return (
      <DialogDescription>
        <strong>{personName}</strong> tas bort permanent. Detta går inte att ångra.
      </DialogDescription>
    );
  }
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <DialogDescription>
        <strong>{personName}</strong> tas bort permanent, och tas då också bort som upphovsperson på de
        här styckena:
      </DialogDescription>
      <ul className="list-disc space-y-1 pl-5">
        {pieces.map((piece) => (
          <li key={piece.pieceId}>{piece.name}</li>
        ))}
      </ul>
      <p>Detta går inte att ångra.</p>
    </div>
  );
}
