# Content URLs use Slugs that follow the name, and only the id link is permanent

Status: accepted

Pieces, Set lists, People, Files, Announcements and Notices are linked by a readable Slug instead of their UUID (PER-481), because choir members share these links and should be able to tell what one points to. A Slug is made from the name (a File's display name, an Announcement's title), is unique within its Group and kind with `-2`, `-3` on a clash, and is made again whenever the name changes. Old Slugs are not kept, so a link by an old Slug returns 404 after a rename. A link by UUID always redirects permanently to the current Slug, which makes it the one permanent link. Announcements belong to no Group, so their Slug is prefixed with the publishing date (`2026-11-24-ny-spelare`, the date in Europe/Stockholm, fixed once published) and only has to be unique within that date. That prefix also keeps an Announcement from ever clashing with the fixed `news/manage` route. Notices get the same date prefix even though they belong to a Group, because their titles repeat ("Repetition torsdag" every week); theirs has to be unique within its Group and date.

The fixed parts of a URL, the route segments the app defines (`pieces`, `setlists`, `news`, `notices`, `me/groups`), are always English, whatever the Swedish UI calls the page. Swedish appears in a URL only inside a Slug, because a Slug is made from a name someone wrote.

## Considered options

- **Keep the first Slug forever**, as Groups do. Rejected: Pieces are often renamed to fix typos or titles, and the URL would keep the old name for good.
- **Keep every old Slug and redirect it to the current one.** Rejected: it needs a slug-history table and rules for when a new item wants a Slug an old one once had, which is more than these links are worth.
- **Id plus Slug in the URL** (`ave-maria-3f9a2c`). Rejected: less readable, and the clean `ave-maria` form was preferred.

## Consequences

- Shared links by Slug break on rename. Anything that must keep working (for example a link in an email) should use the UUID URL.
- Group Slugs still never change; making them follow a rename is a separate decision.
