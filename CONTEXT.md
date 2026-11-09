# Sjung

Sjung is choir/ensemble administration and repertoire planning software: it catalogs musical pieces, the people credited on them, and the ordered set lists a group rehearses or performs from.

## Language

### Groups & people

**Group**:
The organizational unit that owns everything else — its own People catalog, Pieces, and Set lists. Identified by a globally unique, URL-safe slug used for tenant routing (`/app/[groupSlug]/…`).
_Avoid_: Choir, Tenant, Organization — "Group" is deliberately ensemble-agnostic; nothing in the model assumes a choir specifically.

**User**:
A login account. A User can belong to multiple Groups.
_Avoid_: Member (a User's relationship to one specific Group), Person (a different concept entirely — see below).

**Verified user**:
A User who has proven they control their email address. An **Unverified user** can log in but cannot use any Group or app content until they verify. Users who existed before verification was introduced count as Verified.
_Avoid_: Active, Activated, Pending — "active" is already rejected wording around Default group.

**Password reset**:
A User proving control of their email address, via an emailed single-use link, in order to set a new password. Completing one also makes the User Verified and logs out all of that User's sessions. Swedish UI: _Glömt lösenord_ (the entry link), _Återställ lösenord_ (the flow).
_Avoid_: Password recovery, Forgot password (as the concept name — it's only the link label).

**Member**:
A User's association with one Group. May additionally hold one or more Claims granting elevated capabilities — see Claim, Creator.
_Avoid_: User (the account itself, group-independent).

**Invitation**:
A pending offer for one email address to become a Member of one Group, made by a Member holding `MANAGE_MEMBERS`. It is the only way to add someone to a Group — existing Users must accept too. Bound to the invited address: only a User with that email can accept it. Single-use and time-limited; re-inviting the same address replaces the pending Invitation, and it can be revoked but not declined. Grants no Claims — those are granted after joining. Accepting proves control of the address, so it also makes the User a Verified user. Swedish UI: _Inbjudan_.
_Avoid_: Invite (as a noun), Pending member — an Invitation is not a membership yet. Group manager — there is no such role; any Member holding `MANAGE_MEMBERS` can invite.

**Default group**:
The Group a User lands in when opening the app — whichever Group they last switched to. Belongs to the User, not to the browser or the login session, so it survives logging out.
_Avoid_: Active group, Current group.

**Creator**:
The single User who created a Group. Structurally special, not a Claim: the only privilege that can never be granted or revoked by anyone, including the holder — determined by matching the Group's stored creator id, not by a membership record. Creator implicitly holds every Claim and is the only member who can rename or delete the Group itself. See ADR-0001 (superseded), ADR-0002. Swedish UI: _Administratör_ — a UI label only; in English and in code it stays Creator.
_Avoid_: Admin, Owner, Role.

**Claim**:
A specific elevated capability a Member can hold within a Group, independent of Creator status. Today: `MANAGE_MEMBERS` (invite/remove members, grant/revoke Claims on other members) and `MANAGE_CONTENT` (write access to all of the Group's content, bypassing the default that a Member may only edit/delete content they created). A Member may hold neither, either, or both. See ADR-0002. Swedish UI: _Behörighet_ / _Behörigheter_ — _Hantera medlemmar_ (`MANAGE_MEMBERS`), _Hantera innehåll_ (`MANAGE_CONTENT`).
_Avoid_: Role, Permission, Admin — "Claim" is this model's term.

**Person**:
A credited contributor (composer, arranger, lyricist, …) scoped to a Group — deliberately not a login account. A Person may be credited on Pieces without ever holding a Sjung account, and a User is not automatically a Person.
_Avoid_: User, Contributor, Member.

### Repertoire

**Piece**:
The catalog entry for a musical work: a name plus its Credits, Files, Links and Piece notes. Swedish UI: _Stycke_ (the entity), _Noter_ (the catalog/list page name).
_Avoid_: Song, Sheet music, Score — those name the physical artifact (see File), not the work entry itself.

**File**:
An uploaded document (e.g. a score PDF) attached to a Piece, stored in object storage.
_Avoid_: Score, Sheet music, Attachment — reserve those for casual conversation; "File" is the model.

**Link**:
An external URL reference attached to a Piece (e.g. a recording or streaming link).

**Credit**:
A role-tagged link between a Person and a Piece. Roles are a closed set today — Kompositör (composer), Arrangör (arranger), Textförfattare (lyricist) — defined in `lib/roles.ts`; expect this set to grow. Shown grouped per Person: each Person appears once on a Piece, followed by their Credit roles. Swedish UI: _Medverkande_.
_Avoid_: Role on its own — always say "Credit role" to avoid confusion with anything membership-related.

**Set list**:
An ordered rehearsal/performance program for a Group: an interleaved sequence of Set list pieces and Running-order notes. Swedish UI: _Repertoar_ / _Repertoarer_.
_Avoid_: Repertoire (English) — keep "Set list" as the English name even though the Swedish UI says _Repertoar_; Program.

**Set list piece**:
One occurrence of a Piece within a Set list, at a specific position. A Piece may appear more than once in the same Set list, each occurrence with its own position and Performance notes. Swedish UI: _Repertoarpost_.

**Piece note**:
A note attached directly to a Piece and visible everywhere that Piece appears — persistent, Group-wide. Swedish UI: _Anteckning_ / _Anteckningar_.
_Avoid_: Note, Comment — always qualify which of the three note types (see Performance note, Running-order note) you mean.

**Performance note**:
A note scoped to one Set list piece — one specific appearance of a Piece within one Set list (e.g. "watch the key change here for the Nov concert"). Does not affect that Piece's Piece note, or its appearances in other Set lists.

**Running-order note**:
A freestanding entry in a Set list's ordered sequence that isn't tied to any Piece at all (e.g. a pause or an announcement slot) — ordered via the same position sequence as Set list pieces.
