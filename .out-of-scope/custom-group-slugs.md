# Custom or editable Group Slugs

Creators can't type their Group's Slug, and they can't change it once the Group exists. Sjung makes the Slug from the Group's name when the Group is created and keeps it for good.

## Why this is out of scope

A Group's Slug is the root of every link into that Group: `/app/[groupSlug]/…` for Pieces, Set lists, People and Files, and the Group links on Home. Choir members share these links. Two decisions in `CONTEXT.md` set the rules:

- A Slug is "made from its name … and never typed by hand".
- A Group's Slug "never changes once the Group is created", unlike content Slugs.

ADR-0011 doesn't keep old Slugs or redirect from them. So a Group Slug that could change would break every link anyone has shared into that Group, not just one Piece's link. To let Creators change it safely, we'd first need slug history and redirects at the Group level, which ADR-0011 rejected for content as costing more than these links are worth.

A typed Slug with a live availability check is also more than this needs. `createGroup` already makes a valid, unique Slug from the name: it lowercases, transliterates and hyphenates, adds `-2` or `-3` when one is taken, and refuses reserved app routes (see `lib/group-slug.ts`). The name is what Members actually see, and Creators can rename the Group freely.

If this comes back, the real question is whether Group Slugs should follow a rename the way content Slugs do. That decision needs its own ADR, and the ADR has to cover what happens to existing links.

## Prior requests

- PER-125: "Custom group slug with availability checks"
