import { findInGroupOrNull } from "@/lib/find-in-group";
import { findGroupAccess } from "@/lib/group-access";
import * as fileStore from "@/lib/pieces/file-store";

/**
 * A File's download link (`fileDownloadHref`): sends a Member on to a
 * short-lived signed URL. Lists open Files through a plain link to here, not
 * by fetching the URL first, because iOS Safari blocks a tab opened after an
 * await on the tap (PER-415). Any Member may download, so this needs no
 * content right. Someone signed out never gets here: proxy.ts sends them to
 * the login page.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ groupSlug: string; fileId: string }> }) {
  const { groupSlug, fileId } = await params;

  const access = await findGroupAccess(groupSlug);
  if (!access) {
    return notFound();
  }

  const file = await findInGroupOrNull(access.group.id, "file", fileId, {
    select: { storagePath: true, fileName: true, mimeType: true },
  });
  if (!file) {
    return notFound();
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: await fileStore.signDownload(file),
      // The signed URL expires, so a cached redirect would go stale.
      "cache-control": "no-store",
    },
  });
}

function notFound() {
  return new Response("Filen hittades inte", { status: 404 });
}
