# Sjung

Sjung is choir/ensemble administration and repertoire planning software: it catalogs musical pieces, the people credited on them, and the ordered set lists a group rehearses or performs from.

## Language

### Groups & people

**Group**:
The organizational unit that owns everything else — its own People catalog, Pieces, and Set lists. Identified by a globally unique Slug used for tenant routing (`/app/[groupSlug]/…`); unlike other Slugs, a Group's never changes once the Group is created.
_Avoid_: Choir, Tenant, Organization — "Group" is deliberately ensemble-agnostic; nothing in the model assumes a choir specifically.

**Slug**:
The readable, URL-safe name a Group, Piece, Set list, Person, File or Announcement goes by in links, made from its name (a File's display name, an Announcement's title) and never typed by hand. Content Slugs are unique within their Group and kind and follow a rename, so a link by an old Slug stops working; an Announcement's is prefixed with its publishing date. See ADR-0011.
_Avoid_: Handle, Permalink — a Slug is not permanent; the link that always works is the one by id.

**User**:
A login account. A User can belong to multiple Groups. A User has a name, shown to the Members of their Groups, which they can change themselves on Mitt konto.
_Avoid_: Member (a User's relationship to one specific Group), Person (a different concept entirely — see below).

**Verified user**:
A User who has proven they control their email address. An **Unverified user** can log in but cannot use any Group or app content until they verify. Users who existed before verification was introduced count as Verified.
_Avoid_: Active, Activated, Pending — "active" is already rejected wording around Default group.

**Password reset**:
A User proving control of their email address, via an emailed single-use link, in order to set a new password. Completing one also makes the User Verified and logs out all of that User's sessions. Swedish UI: _Glömt lösenord_ (the entry link), _Återställ lösenord_ (the flow).
_Avoid_: Password recovery, Forgot password (as the concept name — it's only the link label).

**Account deletion**:
A Verified user permanently erasing their own User, confirmed by re-entering their password. Their Group content stays with the Group, no longer attributed to anyone; Groups where they are the Creator and the only Member are deleted with them, while Creator of a Group with other Members blocks it until they delete that Group. Invitations sent to their address stay. A receipt is emailed to the address just before it's erased. See ADR-0006. Swedish UI: _Ta bort konto_.
_Avoid_: Deactivate, Close account — nothing is kept to restore.

**Emailed link**:
A single-use, time-limited link sent to an email address, used for Password reset, email verification and Invitations. Only the newest link of its kind works: sending a new one makes the earlier ones invalid, and a new one can go out at most once a minute. Opening the link never changes anything; only pressing its button does. A link whose email failed to send never counts.
_Avoid_: Magic link (nothing logs in by opening it), Token (the secret inside the link, not the link itself).

**Member**:
A User's association with one Group. May additionally hold one or more Claims granting elevated capabilities — see Claim, Creator.
_Avoid_: User (the account itself, group-independent).

**Invitation**:
A pending offer for one email address to become a Member of one Group, made by a Member holding `MANAGE_MEMBERS`. It is the only way to add someone to a Group — existing Users must accept too. Bound to the invited address: only a User with that email can accept it. Single-use and time-limited; re-inviting the same address replaces the pending Invitation, and it can be revoked but not declined. Grants no Claims — those are granted after joining. Accepting proves control of the address, so it also makes the User a Verified user. Swedish UI: _Inbjudan_.
_Avoid_: Invite (as a noun), Pending member — an Invitation is not a membership yet. Group manager — there is no such role; any Member holding `MANAGE_MEMBERS` can invite.

**Default group**:
The Group a User lands in when opening the app, on its Repertoarer page — whichever Group they last switched to. Belongs to the User, not to the browser or the login session, so it survives logging out.
_Avoid_: Active group, Current group.

**Creator**:
The single User who created a Group. Structurally special, not a Claim: the only privilege that can never be granted or revoked by anyone, including the holder — determined by matching the Group's stored creator id, not by a membership record. Creator implicitly holds every Claim and is the only member who can rename or delete the Group itself. See ADR-0001 (superseded), ADR-0002. Swedish UI: _Administratör_ — a UI label only; in English and in code it stays Creator.
_Avoid_: Admin, Owner, Role.

**Claim**:
A specific elevated capability a Member can hold within a Group, independent of Creator status. Today: `MANAGE_MEMBERS` (invite/remove members, grant/revoke Claims on other members), `MANAGE_CONTENT` (create, edit and delete the Group's content; who created a piece of content never matters) and `REORDER_SET_LISTS` (change the order of the Set list steps in any of the Group's Set lists, but not add, remove or edit them). A Member may hold any combination; no Claim implies or requires another. A Member holding none can only read content, and cannot change any of it, not even content they created. `MANAGE_CONTENT` is being split into narrower Claims like `REORDER_SET_LISTS` and will eventually go away. See ADR-0002, ADR-0012. Swedish UI: _Behörighet_ / _Behörigheter_ — _Hantera medlemmar_ (`MANAGE_MEMBERS`), _Hantera innehåll_ (`MANAGE_CONTENT`), _Ändra ordning i repertoarer_ (`REORDER_SET_LISTS`).
_Avoid_: Role, Permission, Admin — "Claim" is this model's term.

**Group access**:
What one User may do in one Group: whether they are a Member at all, and which capabilities they have there (manage members, rename or delete the Group, change a given Member, change the Group's content, reorder its Set lists). Derived from membership, Creator status and Claims — never stored.
_Avoid_: Permissions, Role, Rights.

**Edit mode**:
The state of a Group content page in which it offers controls that change content. Every content page opens read-only and is switched into Edit mode by its own toggle; the mode lasts until the page is left or reloaded, and is never shared between pages or remembered. It is a convenience, not a permission: a Member is offered the toggle only when they hold a capability that matters on that page, and each control in Edit mode shows only to a Member holding the capability it needs (a Set list's move buttons need `reorderSetLists` or `manageContent`; every other control needs `manageContent`). See ADR-0004, ADR-0012. Swedish UI: _Redigera_ (the toggle), _Klar_ (to leave it).
_Avoid_: Admin mode, Write access — those describe Group access, which Edit mode never grants.

**Person**:
A credited contributor (composer, arranger, lyricist, …) scoped to a Group — deliberately not a login account. A Person may be credited on Pieces without ever holding a Sjung account, and a User is not automatically a Person. Two People in a Group may share a name: real people do. Deleting a Person also removes all of their Credits. Swedish UI: _Upphovsperson_ / _Upphovspersoner_ — chosen over _Person_ so it can't be mistaken for the Group's own members, and over _Medverkande_, which in a choir reads as the performers.
_Avoid_: User, Contributor, Member.

### Repertoire

**Piece**:
The catalog entry for a musical work: a name (and any Aliases) plus its Credits, Files, Links and Piece notes. Swedish UI: _Stycke_ (the entity), _Alla noter_ (the catalog/list page name).
_Avoid_: Song, Sheet music, Score — those name the physical artifact (see File), not the work entry itself.

**Alias**:
Another name a Piece goes by — a nickname, a translated title, a first line — so it can be found by the name the choir actually uses. A Piece has any number of Aliases, kept in the order they were added; none repeats another or the Piece's own name (ignoring letter case and spacing), but two Pieces in a Group may share an Alias. Aliases only help finding a Piece: it still sorts and is listed under its name alone. Swedish UI: _Alternativt namn_ / _Alternativa namn_.
_Avoid_: Nickname, Subtitle.

**File**:
An uploaded document (e.g. a score PDF) attached to a Piece, stored in object storage. Deleting a File, its Piece or its Group also deletes its stored content. Replacing a File gives it new content but keeps it the same File: its display name and its place on the Piece stay. See ADR-0005.
_Avoid_: Score, Sheet music, Attachment — reserve those for casual conversation; "File" is the model.

**Playable File**:
A File that Sjung's player can open, because of its format: audio (MP3, M4A/AAC, WAV), MIDI, MusicXML or MuseScore. Its Category plays no part: a Category only groups Files. A MuseScore File stays a Playable File while it is being prepared for the player and if preparing it fails, though it can only be played once it is ready. The uploaded file is always the File and can still be downloaded; anything Sjung derives from it for playing has no name or Category of its own and goes wherever the File goes. Opening a Playable File opens the player; any other File is downloaded. See ADR-0009, ADR-0010.
_Avoid_: Rehearsal file, Audio file, Track — a Playable File may be a score, and "Övningsfiler" is only a Category.

**Part**:
One voice or instrument in a MIDI or notation Playable File that the player mixes on its own: a MIDI file's own tracks, or a score's voices. Its name comes from the file only, or is "Stämma n" when the file gives none; percussion is a Part of its own. The singer may pick one Part as their own (_Min stämma_) for the presets, but only for that visit: nothing about Parts or the mix is stored. Swedish UI: _Stämma_ / _Stämmor_. See ADR-0010.
_Avoid_: Voice (a staff can hold two), Channel, Track (outside MIDI).

**Passage**:
The stretch of a Playable File the player repeats, from a start to an end. In a file with bars it runs over whole bars and is named by them ("takt 16–19"); otherwise by time. Marked by the singer for that visit only and never stored. Swedish UI: _Repetera_ (the control), _avsnitt_.
_Avoid_: Loop, Range, A–B (the keys that mark one, not the thing).

**Link**:
An external URL reference attached to a Piece (e.g. a recording or streaming link).

**Category**:
The free-text label on a File or Link saying what kind of resource it is. A File or Link has at most one Category. Files and Links share one vocabulary per Group: a Group's Categories are simply those on its Files and Links, so a Category nothing uses any more is gone. Two Categories are the same if they differ only in letter case or spacing; the spelling already in use wins. Three are built in and always offered, even to a Group that has never used them — Noter (scores), Övningsfiler (rehearsal files), Inspelningar (recordings) — and they rank first, in that order, ahead of every other Category in alphabetical order. Wherever a Piece's Files and Links are shown, they are grouped under their Categories in that ranking, Files and Links together within each, sorted alphabetically by the name they show (Swedish order, numbers by value, a File before a Link of the same name), with the uncategorized last under _Övrigt_ (giving something the Category "Övrigt" leaves it uncategorized); a Piece where nothing has a Category shows no groups at all. Swedish UI: _Kategori_.
_Avoid_: Tag (a File or Link has only one), Type (clashes with the file's format).

**Credit**:
A role-tagged link between a Person and a Piece. Shown grouped per Person: each Person appears once on a Piece, followed by their Credit roles. Swedish UI: _Upphovspersoner_ — a Piece's Credits are listed under that heading.
_Avoid_: Role on its own — always say "Credit role" to avoid confusion with anything membership-related. _Medverkande_, which in a choir reads as the performers.

**Credit role**:
The free-text label on a Credit saying what the Person did for the Piece. Each Group uses its own vocabulary: a Group's Credit roles are simply those on its Credits — there is no separate list of them, so a Credit role nobody holds any more is gone. Two Credit roles are the same if they differ only in letter case or spacing; the spelling already in use wins. Three are built in and always offered, even to a Group that has never used them — Arrangör (arranger), Kompositör (composer), Textförfattare (lyricist) — and they rank first, in that order, ahead of every other Credit role in alphabetical order. That ranking also orders the People on a Piece, by their highest-ranked Credit role. Swedish UI: _Roll_.
_Avoid_: Role on its own, Credit type.

**Piece import**:
Adding many Pieces with their Credits at once from rows pasted from a spreadsheet: one row per Piece, the title first, then one column per Credit role naming the People who hold it. Nothing is saved until the user has seen what will be added and confirmed it, and then everything is saved together or nothing is. People and Credit roles the Group already has are reused, never duplicated. Swedish UI: _Importera_.
_Avoid_: Bulk add, Upload — no file is uploaded; the rows are pasted.

**Set list**:
An ordered rehearsal/performance program for a Group: an interleaved sequence of Set list pieces and Running-order notes. Swedish UI: _Repertoar_ / _Repertoarer_.
_Avoid_: Repertoire (English) — keep "Set list" as the English name even though the Swedish UI says _Repertoar_; Program.

**Current**:
A Set list the Group is working on right now. Any number of a Group's Set lists can be Current at once. Only a Member who can manage content marks or unmarks it, and it never ends on its own: a Set list stays Current until someone unmarks it, even after its date has passed. Current Set lists come first in the Set lists list's default order. Swedish UI: _Aktuell_.
_Avoid_: Active, Featured, Pinned.

**Set list step**:
One entry in a Set list's running order: either a Set list piece or a Running-order note. Steps of both kinds share one order; only their relative order matters, not the numbers stored for it. A newly added step goes last. Swedish UI: _Ordning_ (the running order as a whole).
_Avoid_: Item, Entry, Slot.

**Set list piece**:
One occurrence of a Piece within a Set list, at a specific position. A Piece may appear more than once in the same Set list, each occurrence with its own position, Performance notes and Hidden Files and Links. Swedish UI: _Repertoarpost_.

**Hidden**:
A File or Link marked as not shown on one Set list piece, to keep only what that appearance needs. Everything is shown unless hidden, so a File or Link added to the Piece later shows up on its Set list pieces too. Hiding never affects the Piece itself, its other Set list pieces or other Set lists, and a hidden File or Link stays hidden when it is replaced or edited. Outside Edit mode a hidden File or Link is simply absent wherever that Set list piece is shown, and Categories are grouped as if it did not exist; in Edit mode it shows dimmed, so it can be unhidden. The Piece's page, opened from that Set list piece, tells anyone viewing it how many Files and Links are hidden and lets them show those too, dimmed, until they leave the page. Swedish UI: _Dold_, _Dölj i repertoaren_ (the action).
_Avoid_: Allowed, Excluded, Filtered.

**Piece note**:
A note attached directly to a Piece and visible everywhere that Piece appears — persistent, Group-wide. Swedish UI: _Anteckning_ / _Anteckningar_.
_Avoid_: Note, Comment — always qualify which of the three note types (see Performance note, Running-order note) you mean.

**Performance note**:
A note scoped to one Set list piece — one specific appearance of a Piece within one Set list (e.g. "watch the key change here for the Nov concert"). Does not affect that Piece's Piece note, or its appearances in other Set lists.

**Running-order note**:
A freestanding entry in a Set list's ordered sequence that isn't tied to any Piece at all (e.g. a pause or an announcement slot) — ordered via the same position sequence as Set list pieces. Its text can be changed without moving it, but never emptied; removing it is always a deletion of its own.

### About Sjung itself

**Feedback**:
A free-text message a Verified user sends to the people running Sjung, about the app itself (bugs, ideas, confusion) — never addressed to a Group or its Members. Sending it promises no reply. Swedish UI: _Feedback_ (_Skicka feedback_ on the button).
_Avoid_: Support, Ticket, Bug report — nothing tracks or guarantees an answer.

**Operator**:
One of the people running Sjung. A site-wide standing, unrelated to any Group: it is not a Claim, grants no Group access, and lets them publish, edit and delete Announcements and see the Group overview. Granted outside the app, never by another User. See ADR-0008.
_Avoid_: Admin, Site admin (the Creator is _Administratör_ in the UI), Staff, Superuser.

**Group overview**:
The Operators' list of every Group in Sjung, showing what each Group is and how big it is (name, slug, when it was created, its Creator, how much it holds and when its content last changed) but never what is in it: no Piece titles, no Member names, no Files. Seeing a Group there gives an Operator no Group access. Swedish UI: _Grupper_, under _Drift_.
_Avoid_: Admin panel, Dashboard.

**Announcement**:
News about Sjung itself (new features, changes, planned downtime), published by an Operator to every Verified user, whichever Groups they are in. It is never addressed to a single Group, and Groups cannot publish them. Each User has read or not read each Announcement on its own: it becomes read when they open it, or when they mark all of them as read at once. Announcements published before a User's account was created count as already read. Swedish UI: _Nyheter_.
_Avoid_: News item, Message, Notification. _Meddelande_ suggests messages between people.

**Privacy policy**:
The public statement of what personal data Sjung keeps, why, who it is shared with, and how a User gets it erased. Users are informed of it, never asked to accept it. Swedish UI: _Integritetspolicy_.
_Avoid_: Privacy notice, GDPR page.

**Terms of use**:
The public rules for using Sjung — chiefly that Files may only be uploaded by someone with the right to store them digitally. Separate from the Privacy policy, which is about personal data only. Swedish UI: _Användarvillkor_.
_Avoid_: Terms of service, EULA, Copyright policy.
