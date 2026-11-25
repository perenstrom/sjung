-- Granting Claims split off from MANAGE_MEMBERS (ADR-0013). Every Member who
-- holds MANAGE_MEMBERS keeps that power by also getting MANAGE_MEMBER_AUTHORIZATION.
-- A separate migration from the enum change: Postgres won't use a new enum
-- value in the transaction that adds it.
INSERT INTO "group_member_claims" ("user_id", "group_id", "claim")
SELECT "user_id", "group_id", 'MANAGE_MEMBER_AUTHORIZATION'
FROM "group_member_claims"
WHERE "claim" = 'MANAGE_MEMBERS'
ON CONFLICT DO NOTHING;
