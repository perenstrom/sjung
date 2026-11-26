import { findGroupAccess } from "@/lib/group-access";
import * as coverImageStore from "@/lib/groups/cover-image-store";

/**
 * Home's Cover image (`groupCoverImagePath`): sends a Member on to a
 * short-lived signed URL. The image is for Members, so anyone else gets the
 * same not found as a Group without one. Someone signed out never gets here:
 * proxy.ts sends them to the login page.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ groupSlug: string }> }) {
  const { groupSlug } = await params;

  const access = await findGroupAccess(groupSlug);
  const image = access ? await coverImageStore.findCoverImage(access.group.id) : null;
  if (!image) {
    return new Response("Bilden hittades inte", { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: await coverImageStore.signCoverImageView(image),
      // The signed URL expires, so a cached redirect would go stale.
      "cache-control": "no-store",
    },
  });
}
