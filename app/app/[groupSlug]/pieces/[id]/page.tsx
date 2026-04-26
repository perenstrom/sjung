import { getPieceDetail } from "@/app/actions/pieces";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
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

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TenantPieceDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const piece = await getPieceDetail(groupSlug, id);

  if (!piece) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{piece.name}</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Metadata</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">ID</dt>
          <dd>{piece.id}</dd>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Medverkande</h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Filer</h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Länkar</h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Setlists</h2>
        {piece.setListEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Stycket finns inte i någon setlist ännu.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {piece.setListEntries.map((entry) => (
              <li key={entry.id}>
                <Link className="underline" href={`/app/${groupSlug}/setlists/${entry.setListId}`}>
                  {entry.setListName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
