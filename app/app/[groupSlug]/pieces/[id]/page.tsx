import { getPeople } from "@/app/actions/people";
import { getPieceDetail } from "@/app/actions/pieces";
import { getSetLists } from "@/app/actions/setlists";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { PieceLinksDialog } from "@/components/PieceLinksDialog";
import { PieceMetadataSection } from "@/components/PieceMetadataSection";
import { PieceSetListsSection } from "@/components/PieceSetListsSection";
import type { Piece } from "@/components/PieceLinksDialog/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFileSize } from "@/lib/formatFileSize";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function TenantPieceDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [piece, people, setLists] = await Promise.all([
    getPieceDetail(groupSlug, id),
    getPeople(groupSlug),
    getSetLists(groupSlug),
  ]);

  if (!piece) {
    notFound();
  }

  const pieceForLinksDialog: Piece = {
    id: piece.id,
    name: piece.name,
    files: piece.files.map((file) => ({
      id: file.id,
      displayName: file.displayName,
      size: file.size,
    })),
    links: piece.links.map((link) => ({
      id: link.id,
      url: link.url,
      label: link.label,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{piece.name}</h1>
      </div>

      <PieceMetadataSection
        key={piece.id}
        groupSlug={groupSlug}
        pieceId={piece.id}
        initialName={piece.name}
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
          <h2 className="text-lg font-medium">Medverkande</h2>
          <EditPieceDialog
            creditsOnly
            groupSlug={groupSlug}
            people={people}
            piece={{
              id: piece.id,
              name: piece.name,
              credits: piece.credits.map((credit) => ({
                personId: credit.personId,
                role: credit.role,
              })),
            }}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {piece.credits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga medverkande tillagda ännu.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {piece.credits.map((credit) => (
                <li key={`${credit.personId}:${credit.role}`}>
                  {credit.person.name} ({credit.role})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
          <h2 className="text-lg font-medium">Filer och länkar</h2>
          <PieceLinksDialog
            groupSlug={groupSlug}
            piece={pieceForLinksDialog}
            refreshAfterMutations
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Filer</h3>
            {piece.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga filer uppladdade ännu.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Fil</TableHead>
                    <TableHead>MIME</TableHead>
                    <TableHead>Storlek</TableHead>
                    <TableHead>Uppladdad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {piece.files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{file.displayName}</TableCell>
                      <TableCell>{file.fileName}</TableCell>
                      <TableCell>{file.mimeType}</TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>{formatDateTime(file.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Länkar</h3>
            {piece.links.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga länkar tillagda ännu.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {piece.links.map((link) => (
                  <li key={link.id}>
                    <a className="underline" href={link.url} target="_blank" rel="noreferrer">
                      {link.label?.trim() ? link.label : link.url}
                    </a>
                    <span className="ml-2 text-muted-foreground">
                      ({formatDateTime(link.createdAt)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <PieceSetListsSection
        groupSlug={groupSlug}
        pieceId={piece.id}
        entries={piece.setListEntries}
        allSetLists={setLists.map((sl) => ({ id: sl.id, name: sl.name }))}
      />
    </div>
  );
}
